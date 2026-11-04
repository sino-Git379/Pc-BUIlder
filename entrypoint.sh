#!/bin/sh
set -e

echo "==> [RigForge Docker] Running database migrations..."
python manage.py migrate --noinput

echo "==> [RigForge Docker] Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "==> [RigForge Docker] Seeding catalog hardware & accounts (if needed)..."
python manage.py seed_catalog || true

echo "==> [RigForge Docker] Starting Gunicorn with Uvicorn ASGI workers..."
exec gunicorn server.asgi:application \
    --name rigforge_asgi \
    --workers ${GUNICORN_WORKERS:-3} \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
