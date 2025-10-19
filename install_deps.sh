#!/bin/bash
# Install Python dependencies during build phase
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt --no-cache-dir
echo "✅ Python dependencies installed"
