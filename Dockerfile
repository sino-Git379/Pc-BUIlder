# =============================================================================
# RigForge Multi-Stage Production Dockerfile
# Stage 1: Build React/Vite Frontend
# Stage 2: Python / Django Runtime with Gunicorn & Uvicorn ASGI
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Frontend Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Ensure output directory hierarchy matches vite.config.js (../static/dist)
RUN mkdir -p /build/static/dist

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Python Backend Runtime
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY . .

# Copy compiled production assets from Stage 1 into static/dist
COPY --from=frontend-builder /build/static/dist /app/static/dist

# Normalize line endings and ensure entrypoint script is executable
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Prepare persistent data directories
RUN mkdir -p /app/data /app/media /app/staticfiles

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
