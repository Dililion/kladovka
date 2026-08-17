#!/bin/bash

echo "🚀 Starting Kladovka application..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
fi

# Build and start containers
echo "🔨 Building Docker images..."
docker-compose build

echo "🚢 Starting containers..."
docker-compose up -d

echo ""
echo "✅ Application started successfully!"
echo ""
echo "📍 Access the application at:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:3000"
echo "   Health check: http://localhost:3000/health"
echo ""
echo "📊 Check logs with: docker-compose logs -f"
echo "🛑 Stop with: docker-compose down"
echo ""
