# Use Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies for rembg (image processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements-prod.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-prod.txt

# Copy application code
COPY . .

# Create upload directory
RUN mkdir -p uploads

# Expose port (Render will set PORT env var)
EXPOSE $PORT

# Run gunicorn
CMD gunicorn --workers 2 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT app:app
