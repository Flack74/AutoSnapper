#!/bin/bash

# Local Development Setup Script
set -e

echo "🛠️  Setting up AutoSnapper for local development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
go mod download
go mod tidy
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Start services with docker-compose
echo "🚀 Starting services with Docker Compose..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Health check
echo "🏥 Performing health checks..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
fi

echo "🎉 Local development environment is ready!"
echo "🌐 Frontend: http://localhost:80"
echo "🔧 Backend API: http://localhost:8080"
echo "📊 Backend Health: http://localhost:8080/health"
echo "🗄️  Redis: localhost:6379"

echo ""
echo "📝 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Rebuild: docker-compose up --build"