#!/bin/bash
# USRA PLUS - Production Deployment Script
# Usage: ./deploy.sh [vercel|docker|check]

set -e

echo "=========================================="
echo "  USRA PLUS - Deployment Script"
echo "=========================================="

# Check if .env.production exists
check_env() {
  if [ ! -f .env.production ]; then
    echo "❌ .env.production not found!"
    echo "   Copy .env.example to .env.production and fill in the values:"
    echo "   cp .env.example .env.production"
    exit 1
  fi
  echo "✅ .env.production found"
}

# Check required environment variables
check_vars() {
  local missing=0
  
  if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
    missing=1
  fi
  if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
    missing=1
  fi
  if [ -z "$UPSTASH_REDIS_REST_URL" ]; then
    echo "❌ UPSTASH_REDIS_REST_URL not set"
    missing=1
  fi
  if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY not set"
    missing=1
  fi
  
  if [ $missing -eq 1 ]; then
    echo ""
    echo "Please set the missing environment variables in .env.production"
    exit 1
  fi
  
  echo "✅ All required environment variables are set"
}

# Run pre-deployment checks
pre_deploy() {
  echo ""
  echo "🔍 Running pre-deployment checks..."
  echo ""
  
  check_env
  
  # Load env vars
  set -a
  source .env.production
  set +a
  
  check_vars
  
  echo ""
  echo "📦 Installing dependencies..."
  npm install --production=false
  
  echo ""
  echo "🗄️  Running database migrations..."
  npx prisma generate
  npx prisma migrate deploy
  
  echo ""
  echo "✅ Pre-deployment checks passed!"
}

# Deploy to Vercel
deploy_vercel() {
  pre_deploy
  
  echo ""
  echo "🚀 Deploying to Vercel..."
  
  if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
  fi
  
  vercel --prod --env-file .env.production
}

# Build Docker image
deploy_docker() {
  pre_deploy
  
  echo ""
  echo "🐳 Building Docker image..."
  
  docker build -t usra-plus:latest .
  
  echo ""
  echo "✅ Docker image built successfully!"
  echo "   Run with: docker run -p 3000:3000 --env-file .env.production usra-plus:latest"
}

# Run health check
health_check() {
  echo ""
  echo "🏥 Running health check..."
  
  local url=${1:-http://localhost:3000}
  
  echo "   Checking $url..."
  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
    echo "✅ App is running and responding"
  else
    echo "❌ App is not responding"
    exit 1
  fi
}

# Main
case "${1:-check}" in
  vercel)
    deploy_vercel
    ;;
  docker)
    deploy_docker
    ;;
  check)
    pre_deploy
    ;;
  health)
    health_check "${2:-}"
    ;;
  *)
    echo "Usage: $0 {vercel|docker|check|health [url]}"
    echo ""
    echo "Commands:"
    echo "  vercel   - Deploy to Vercel"
    echo "  docker   - Build Docker image"
    echo "  check    - Run pre-deployment checks"
    echo "  health   - Run health check (optional: specify URL)"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "  Deployment complete! 🎉"
echo "=========================================="
