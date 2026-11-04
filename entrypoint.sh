#!/bin/sh
set -e

echo "==> Running Django database migrations..."
python manage.py migrate --noinput

echo "==> Collecting static assets..."
python manage.py collectstatic --noinput --clear

echo "==> Seeding catalog & marketplace data..."
python manage.py seed_catalog || true

echo "==> Ensuring admin superuser exists..."
python manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
u, created = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com'})
u.set_password('12341234!')
u.is_staff = True
u.is_superuser = True
if hasattr(u, 'role'):
    u.role = 'Admin'
u.save()
print("Superuser admin verified.")
EOF

echo "==> Starting Gunicorn ASGI Server (Uvicorn Worker)..."
exec gunicorn --workers 3 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120 server.asgi:application
