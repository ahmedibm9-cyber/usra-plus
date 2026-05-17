# USRA PLUS - Production Deployment Guide

## Prerequisites

1. **Node.js 20+** or **Bun 1.0+**
2. **PostgreSQL 15+** (Supabase recommended)
3. **Upstash Redis** (for rate limiting)
4. **Vercel account** (recommended) or any Node.js hosting

---

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
3. Run SQL migrations:
   ```bash
   # Connect to your Supabase SQL editor
   # Run all files in supabase/ folder in order:
   # 1. migration.sql
   # 2. additional-tables.sql
   # 3. add-missing-tables.sql
   # 4. complete-fix-migration.sql
   # 5. business-control-migration.sql
   # 6. final-migration.sql
   # 7. fix-policies.sql
   # 8. fix-partial-migration.sql
   # 9. rls-and-indexes-migration.sql
   ```

### Step 2: Set up Upstash Redis

1. Go to [upstash.com](https://upstash.com) and create a Redis database
2. Copy the credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 3: Configure Environment Variables

Create a `.env.production` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Email (Resend)
RESEND_API_KEY=re_...

# Sentry (error monitoring)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...

# Database (Prisma - same as Supabase)
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
```

### Step 5: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Or use the Vercel dashboard:
# 1. Push your code to GitHub
# 2. Connect your repo at vercel.com
# 3. Add environment variables in Vercel dashboard
# 4. Deploy automatically on push
```

### Step 6: Post-Deployment Verification

### Step 1: Build the Docker Image

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

### Step 2: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: always
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Step 3: Deploy

```bash
docker-compose up -d
```

---

## Option 3: Deploy to AWS/GCP/Azure

### AWS (ECS/EKS)

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
docker build -t usra-plus .
docker tag usra-plus:latest your-account.dkr.ecr.us-east-1.amazonaws.com/usra-plus:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/usra-plus:latest

# Deploy to ECS
aws ecs update-service --cluster usra-cluster --service usra-service --force-new-deployment
```

---

## Post-Deployment Checklist

### 1. Verify Environment Variables
```bash
# Check all required vars are set
curl https://your-domain.com/api/health
```

### 2. Run Database Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

### 3. Seed Initial Data
```bash
npm run db:seed
```

### 4. Test Key Features
- [ ] User registration and login
- [ ] Family creation
- [ ] Task management
- [ ] Calendar sync
- [ ] Chat functionality
- [ ] File uploads
- [ ] Admin dashboard access

### 5. Set up Monitoring
- [ ] Sentry error tracking
- [ ] Vercel Analytics
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Log aggregation (if self-hosted)

### 6. Security Hardening
- [ ] Enable HTTPS (Vercel does this automatically)
- [ ] Set up CSP headers
- [ ] Enable rate limiting (Redis configured)
- [ ] Review RLS policies in Supabase
- [ ] Rotate API keys regularly

---

## Production Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app URL |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RESEND_API_KEY` | No | Email service key |
| `SENTRY_DSN` | No | Error monitoring |
| `SENTRY_AUTH_TOKEN` | No | Sentry uploads |
| `NODE_ENV` | Yes | Set to `production` |

---

## Scaling

### Horizontal Scaling
- Vercel auto-scales based on traffic
- For self-hosted: use Kubernetes or ECS with auto-scaling

### Database Scaling
- Supabase handles connection pooling automatically
- For high traffic: enable Supabase Pro plan

### CDN
- Vercel includes global CDN
- For self-hosted: use Cloudflare in front of your server

---

## Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
```bash
# Test connection
npx prisma db pull
```

### Rate Limiting Not Working
```bash
# Verify Redis connection
curl $UPSTASH_REDIS_REST_URL/ping -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

---

## Support

- Documentation: README.md
- Issues: GitHub Issues
- Admin Dashboard: Click logo 7 times rapidly
