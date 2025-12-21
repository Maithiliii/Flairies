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

# Add debug output and error handling
CMD python manage.py migrate && \
    echo "Migrations completed successfully" && \
    echo "PORT is: $PORT" && \
    echo "Starting Django server..." && \
    python manage.py runserver 0.0.0.0:$PORT --verbosity=2
