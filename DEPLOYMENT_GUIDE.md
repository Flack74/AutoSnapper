# AutoSnapper Deployment Guide 🚀

This guide covers all deployment options for AutoSnapper, from local development to production cloud deployment.

## 🏠 Local Development

### Quick Start
```bash
# Clone and start all services
git clone <your-repo>
cd AutoSnapper
./scripts/local-dev.sh
```

### Manual Setup
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Backend
cd backend
export REDIS_URL=redis://localhost:6379
go run main.go

# Frontend (new terminal)
cd frontend
npm install && npm run dev
```

### Docker Compose
```bash
docker-compose up --build
```

**Access Points:**
- Frontend: http://localhost:80
- Backend: http://localhost:8080
- Health: http://localhost:8080/health
- Redis: localhost:6379

---

## ☁️ Cloud Deployment Options

### 1. AWS with Terraform (Recommended for Production)

**Prerequisites:**
- AWS CLI configured
- Terraform installed
- Docker Hub account

**Steps:**
```bash
# 1. Set environment variables
export DOCKER_HUB_USERNAME=your-username
export AWS_REGION=us-east-1

# 2. Update Terraform variables
cd terraform
cp variables.tf.example variables.tf
# Edit variables.tf with your values

# 3. Deploy
./scripts/deploy.sh
```

**What gets deployed:**
- ECS Fargate cluster
- Application Load Balancer
- ElastiCache Redis
- VPC with public subnets
- CloudWatch logging
- S3 bucket for assets

### 2. Render (Easiest)

**Backend Service:**
- Repository: Your GitHub repo
- Build Command: `cd backend && go build -o main .`
- Start Command: `./backend/main`
- Environment Variables:
  ```
  REDIS_URL=your-redis-url
  LOG_LEVEL=info
  ```

**Frontend Service:**
- Repository: Your GitHub repo
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`
- Environment Variables:
  ```
  VITE_BACKEND_URL=https://your-backend-url.onrender.com
  ```

**Redis:**
- Add Redis service in Render dashboard

### 3. Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 4. Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy backend
cd backend
fly launch --name autosnapper-backend

# Deploy frontend
cd ../frontend
fly launch --name autosnapper-frontend
```

---

## 🔧 Environment Variables

### Backend
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 8080 | No |
| `REDIS_URL` | Redis connection string | - | No |
| `LOG_LEVEL` | Logging level | info | No |

### Frontend
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_BACKEND_URL` | Backend API URL | http://localhost:8080 | Yes |

---

## 🔄 CI/CD Setup

### GitHub Actions Setup

1. **Add Repository Secrets:**
   ```
   DOCKER_HUB_USERNAME=your-username
   DOCKER_HUB_TOKEN=your-access-token
   RENDER_DEPLOY_HOOK_URL=your-render-hook (optional)
   PRODUCTION_URL=your-production-url (optional)
   ```

2. **Push to main branch** - CI/CD will automatically:
   - Run tests
   - Build Docker images
   - Push to Docker Hub
   - Deploy to production (if configured)

### Manual Docker Build
```bash
# Backend
docker build -t your-username/autosnapper-backend:latest ./backend
docker push your-username/autosnapper-backend:latest

# Frontend
docker build -t your-username/autosnapper-frontend:latest ./frontend
docker push your-username/autosnapper-frontend:latest
```

---

## 📊 Monitoring & Health Checks

### Health Endpoints
- `GET /health` - Service health status
- Response includes Redis connectivity status

### Logging
- Structured JSON logs
- Configurable log levels
- Request tracing with duration

### Metrics to Monitor
- Response times
- Cache hit rates
- Error rates
- Memory usage
- Redis connection status

---

## 🛠️ Troubleshooting

### Common Issues

**Redis Connection Failed:**
```bash
# Check Redis URL format
export REDIS_URL=redis://username:password@host:port

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

**Docker Build Issues:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

**Health Check Failures:**
```bash
# Check service logs
docker-compose logs backend

# Test health endpoint
curl http://localhost:8080/health
```

**Frontend Can't Connect to Backend:**
- Verify `VITE_BACKEND_URL` environment variable
- Check CORS headers in backend logs
- Ensure backend is accessible from frontend

### Performance Optimization

**Backend:**
- Enable Redis caching
- Adjust Go garbage collector settings
- Use connection pooling

**Frontend:**
- Enable gzip compression
- Use CDN for static assets
- Implement service worker caching

**Infrastructure:**
- Use multiple availability zones
- Enable auto-scaling
- Configure CloudFront CDN

---

## 🔒 Security Considerations

### Production Checklist
- [ ] Use HTTPS/TLS certificates
- [ ] Enable Redis AUTH
- [ ] Restrict CORS origins
- [ ] Use secrets management
- [ ] Enable security headers
- [ ] Regular security scans
- [ ] Monitor for vulnerabilities

### Environment Security
```bash
# Use secrets instead of environment variables
export REDIS_PASSWORD_FILE=/run/secrets/redis_password
export DATABASE_URL_FILE=/run/secrets/database_url
```

---

## 📈 Scaling Considerations

### Horizontal Scaling
- Multiple backend instances behind load balancer
- Redis cluster for high availability
- CDN for static assets

### Vertical Scaling
- Increase container CPU/memory
- Optimize database queries
- Use caching strategies

### Cost Optimization
- Use spot instances for non-critical workloads
- Implement auto-scaling policies
- Monitor and optimize resource usage

---

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Test health endpoints
4. Create GitHub issue with logs and configuration