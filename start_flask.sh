#!/bin/bash
# Flask Virtual Fitting App Starter
echo "🎨 Starting AI Virtual Fitting App..."
echo "🔄 Stopping any existing servers..."

# Kill any existing processes on port 5000
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "node" 2>/dev/null || true

sleep 1

echo "🚀 Starting Flask server on port 5000..."
python app.py
