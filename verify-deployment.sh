#!/bin/bash
# USRA PLUS - Post-Deployment Verification Script
# Usage: ./verify-deployment.sh [your-domain.com]

set -e

DOMAIN="${1:-localhost:3000}"
PASS=0
FAIL=0
WARN=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  USRA PLUS - Post-Deployment Verification"
echo "=========================================="
echo ""
echo "Testing: https://$DOMAIN"
echo ""

# Helper functions
check_pass() {
  echo -e "  ✅ $1"
  PASS=$((PASS + 1))
}

check_fail() {
  echo -e "  ❌ $1"
  FAIL=$((FAIL + 1))
}

check_warn() {
  echo -e "  ⚠️  $1"
  WARN=$((WARN + 1))
}

# ─── 1. Basic Connectivity ──────────────────────────────────────
echo "📡 1. Basic Connectivity"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --max-time 10 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  check_pass "App responding (HTTP 200)"
elif [ "$HTTP_CODE" = "000" ]; then
  check_fail "App not reachable (connection failed)"
else
  check_fail "Unexpected response (HTTP $HTTP_CODE)"
fi

# ─── 2. Security Headers ────────────────────────────────────────
echo ""
echo "🔒 2. Security Headers"

HEADERS=$(curl -sI "https://$DOMAIN" --max-time 10 2>/dev/null || echo "")

if echo "$HEADERS" | grep -qi "x-frame-options: DENY"; then
  check_pass "X-Frame-Options: DENY"
else
  check_warn "X-Frame-Options not set"
fi

if echo "$HEADERS" | grep -qi "x-content-type-options: nosniff"; then
  check_pass "X-Content-Type-Options: nosniff"
else
  check_warn "X-Content-Type-Options not set"
fi

if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  check_pass "HSTS enabled"
else
  check_warn "HSTS not enabled"
fi

if echo "$HEADERS" | grep -qi "referrer-policy"; then
  check_pass "Referrer-Policy set"
else
  check_warn "Referrer-Policy not set"
fi

# ─── 3. API Health ──────────────────────────────────────────────
echo ""
echo "🏥 3. API Health"

API_RESPONSE=$(curl -s "https://$DOMAIN/api/health" --max-time 10 2>/dev/null || echo "")

if echo "$API_RESPONSE" | grep -q "ok"; then
  check_pass "Health endpoint working"
else
  check_fail "Health endpoint not responding"
fi

# ─── 4. Environment Variables ───────────────────────────────────
echo ""
echo "🔑 4. Environment Variables"

if [ -f .env.production ]; then
  check_pass ".env.production exists"
  
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.production; then
    check_pass "Supabase URL configured"
  else
    check_fail "Supabase URL missing"
  fi
  
  if grep -q "UPSTASH_REDIS_REST_URL" .env.production; then
    check_pass "Redis configured"
  else
    check_warn "Redis not configured (rate limiting disabled)"
  fi
  
  if grep -q "STRIPE_SECRET_KEY" .env.production; then
    check_pass "Stripe configured"
  else
    check_warn "Stripe not configured (payments disabled)"
  fi
else
  check_fail ".env.production not found"
fi

# ─── 5. Database Connection ─────────────────────────────────────
echo ""
echo "🗄️  5. Database Connection"

if command -v npx &> /dev/null; then
  if npx prisma db pull --preview-feature 2>/dev/null | grep -q "Introspected"; then
    check_pass "Database connection working"
  else
    check_warn "Could not verify database connection (run manually: npx prisma db pull)"
  fi
else
  check_warn "npx not available"
fi

# ─── 6. Redis Connection ────────────────────────────────────────
echo ""
echo "🔴 6. Redis Connection"

if [ -f .env.production ]; then
  REDIS_URL=$(grep "UPSTASH_REDIS_REST_URL" .env.production | cut -d'=' -f2)
  REDIS_TOKEN=$(grep "UPSTASH_REDIS_REST_TOKEN" .env.production | cut -d'=' -f2)
  
  if [ -n "$REDIS_URL" ] && [ -n "$REDIS_TOKEN" ]; then
    PING_RESPONSE=$(curl -s "$REDIS_URL/ping" -H "Authorization: Bearer $REDIS_TOKEN" 2>/dev/null || echo "")
    if echo "$PING_RESPONSE" | grep -q "+PONG"; then
      check_pass "Redis connected"
    else
      check_warn "Redis not responding (rate limiting may not work)"
    fi
  else
    check_warn "Redis credentials not found"
  fi
fi

# ─── 7. Performance ─────────────────────────────────────────────
echo ""
echo "⚡ 7. Performance"

LOAD_TIME=$(curl -o /dev/null -s -w "%{time_total}" "https://$DOMAIN" --max-time 30 2>/dev/null || echo "0")

if [ "$LOAD_TIME" != "0" ]; then
  if (( $(echo "$LOAD_TIME < 2.0" | bc -l 2>/dev/null || echo 1) )); then
    check_pass "Page load: ${LOAD_TIME}s (< 2s)"
  else
    check_warn "Page load: ${LOAD_TIME}s (> 2s)"
  fi
else
  check_fail "Could not measure load time"
fi

# ─── 8. SSL Certificate ─────────────────────────────────────────
echo ""
echo "🔐 8. SSL Certificate"

if echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | grep -q "Verify return code: 0"; then
  check_pass "SSL certificate valid"
else
  check_warn "Could not verify SSL (may be self-signed or not deployed yet)"
fi

# ─── Summary ────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  Verification Summary"
echo "=========================================="
echo -e "  ✅ Passed:  $PASS"
echo -e "  ❌ Failed:  $FAIL"
echo -e "  ⚠️  Warnings: $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 Deployment looks good!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run database migrations: npx prisma migrate deploy"
  echo "  2. Seed initial data: npm run db:seed"
  echo "  3. Set up Stripe webhook (see POST-DEPLOYMENT.md)"
  echo "  4. Create admin account (see POST-DEPLOYMENT.md)"
  echo "  5. Test all features (see POST-DEPLOYMENT.md)"
else
  echo -e "${RED}⚠️  Some checks failed. Review the output above.${NC}"
  echo ""
  echo "Common fixes:"
  echo "  - App not reachable: Check deployment status"
  echo "  - Missing env vars: Update .env.production"
  echo "  - Database issues: Check DATABASE_URL format"
  echo "  - Redis issues: Check Upstash credentials"
fi

echo ""
echo "For detailed instructions, see: POST-DEPLOYMENT.md"
echo "=========================================="

exit $FAIL
