#!/bin/bash

# AutoSnapper Deployment Script
set -e

echo "🚀 Starting AutoSnapper deployment..."

# Check if required environment variables are set
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo "❌ DOCKER_HUB_USERNAME environment variable is required"
    exit 1
fi

# Build and push Docker images
echo "📦 Building and pushing Docker images..."

# Backend
echo "Building backend image..."
docker build -t $DOCKER_HUB_USERNAME/autosnapper-backend:latest ./backend
docker push $DOCKER_HUB_USERNAME/autosnapper-backend:latest

# Frontend
echo "Building frontend image..."
docker build -t $DOCKER_HUB_USERNAME/autosnapper-frontend:latest ./frontend
docker push $DOCKER_HUB_USERNAME/autosnapper-frontend:latest

echo "✅ Docker images built and pushed successfully!"

# Deploy with Terraform (if terraform directory exists)
if [ -d "terraform" ]; then
    echo "🏗️  Deploying infrastructure with Terraform..."
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="backend_image=$DOCKER_HUB_USERNAME/autosnapper-backend:latest" \
                   -var="frontend_image=$DOCKER_HUB_USERNAME/autosnapper-frontend:latest"
    
    # Apply deployment (with confirmation)
    read -p "Do you want to apply these changes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply -var="backend_image=$DOCKER_HUB_USERNAME/autosnapper-backend:latest" \
                       -var="frontend_image=$DOCKER_HUB_USERNAME/autosnapper-frontend:latest" \
                       -auto-approve
        
        echo "✅ Infrastructure deployed successfully!"
        echo "🌐 Application URL: $(terraform output -raw application_url)"
    else
        echo "❌ Deployment cancelled"
        exit 1
    fi
    
    cd ..
fi

echo "🎉 Deployment completed successfully!"