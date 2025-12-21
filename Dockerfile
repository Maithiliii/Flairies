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

# Use Django development server (more reliable for debugging)
CMD python manage.py migrate && \
    python manage.py collectstatic --noinput && \
    echo "Starting Django development server on port $PORT..." && \
    python manage.py runserver 0.0.0.0:$PORT
