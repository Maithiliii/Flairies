FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose port
EXPOSE 8000

# Run migrations and start with Gunicorn
CMD python manage.py migrate && python manage.py collectstatic --noinput && gunicorn flairies_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2
