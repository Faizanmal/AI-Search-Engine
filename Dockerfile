# ---- Backend build stage ----
FROM python:3.12-slim AS backend

WORKDIR /app/backend

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Collect static (no-input for CI)
RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]


# ---- Frontend build stage ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline

COPY frontend/ .
RUN npm run build


# ---- Frontend production stage ----
FROM node:20-alpine AS frontend

WORKDIR /app/frontend

# Only copy what's needed for production
COPY --from=frontend-builder /app/frontend/.next .next
COPY --from=frontend-builder /app/frontend/public public
COPY --from=frontend-builder /app/frontend/package.json .
COPY --from=frontend-builder /app/frontend/node_modules node_modules

EXPOSE 3000

CMD ["npm", "start"]
