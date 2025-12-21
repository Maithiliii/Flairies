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

# Run migrations during build (not runtime)
RUN python manage.py migrate --settings=flairies_backend.settings || echo "Migration failed, continuing..."

# Expose port
EXPOSE 8000

# Just start the server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
