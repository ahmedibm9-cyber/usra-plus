# USRA PLUS - Post-Deployment Checklist

## Step 1: Verify Deployment

### Check App Status
```bash
# Replace with your actual domain
curl -I https://your-domain.com
```

Expected response:
```
HTTP/2 200
x-frame-options: DENY
x-content-type-options: nosniff
strict-transport-security: max-age=31536000; includeSubDomains
```

### Check API Health
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{ "status": "ok", "timestamp": "2026-05-17T..." }
```

---

## Step 2: Set Up Supabase Database

### 2.1 Connect to Supabase SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 2.2 Run Migrations (in order)

Run each file's content in the SQL Editor, one at a time:

```
Order:
1. supabase/migration.sql
2. supabase/additional-tables.sql
3. supabase/add-missing-tables.sql
4. supabase/complete-fix-migration.sql
5. supabase/business-control-migration.sql
6. supabase/final-migration.sql
7. supabase/fix-policies.sql
8. supabase/fix-partial-migration.sql
9. supabase/rls-and-indexes-migration.sql
```

**How to run:**
1. Open each `.sql` file from the `supabase/` folder
2. Copy all content
3. Paste into Supabase SQL Editor
4. Click **Run** (or Ctrl+Enter)
5. Wait for success message
6. Move to next file

### 2.3 Verify Tables Created

Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see at least these tables:
- `profiles`
- `families`
- `family_members`
- `tasks`
- `events`
- `messages`
- `grocery_items`
- `meal_plans`
- `budgets`
- `expenses`
- `milestones`
- `chores`
- `files`
- `audit_logs`
- `feature_flags`
- `system_settings`

### 2.4 Enable Row Level Security (RLS)

Run this query to verify RLS is enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

---

## Step 3: Run Prisma Migrations

### 3.1 Generate Prisma Client
```bash
npx prisma generate
```

Expected output:
```
✔ Generated Prisma Client (v6.x.x) to ./node_modules/@prisma/client
```

### 3.2 Push Schema to Database
```bash
# For production (non-destructive)
npx prisma db push --accept-data-loss

# OR for development (creates fresh schema)
npx prisma migrate dev
```

### 3.3 Verify Database Connection
```bash
npx prisma db pull
```

This should complete without errors.

---

## Step 4: Seed Initial Data

### 4.1 Run Seed Script
```bash
npm run db:seed
```

This creates:
- Default subscription plans (Free, Pro, Family+)
- Feature flags
- System settings
- Demo data (if in development mode)

### 4.2 Verify Seed Data

Run in Supabase SQL Editor:
```sql
-- Check subscription plans
SELECT slug, name, monthly_price FROM subscription_plans;

-- Check feature flags
SELECT key, enabled FROM feature_flags;

-- Check system settings
SELECT key, value FROM system_settings;
```

---

## Step 5: Set Up Email (Resend)

### 6.1 Create Admin Account

1. Go to your app: `https://your-domain.com`
2. Sign up with your admin email
3. Verify your email (check inbox)

### 6.2 Grant Admin Privileges

Run in Supabase SQL Editor:
```sql
-- Replace with your actual user ID
-- Find your user ID: SELECT id, email FROM profiles WHERE email = 'your-email@example.com';

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

### 6.3 Access Admin Dashboard

1. Go to login page
2. Click the **USRA PLUS logo 7 times rapidly**
3. Enter admin password (set in `.env` as `DEV_ADMIN_PASSWORD` for dev, or create your own)

### 6.4 Verify Admin Access

You should see:
- Dashboard with analytics
- User management
- Revenue tracking
- System settings
- Audit logs

---

## Step 7: Configure Email (Resend)

### 7.1 Set Up Resend

1. Go to [https://resend.com](https://resend.com)
2. Create account and verify your domain
3. Get API key from **API Keys** section

### 7.2 Update Environment Variable

```bash
# For Vercel
vercel env add RESEND_API_KEY
# Paste your Resend API key
```

### 7.3 Test Email

Run in your app:
1. Sign up with a new account
2. Check if verification email arrives
3. Check spam folder if not in inbox

---

## Step 8: Set Up Monitoring

### 8.1 Sentry Error Tracking

1. Go to [https://sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Get your DSN from **Project Settings → Client Keys**

```bash
# For Vercel
vercel env add SENTRY_DSN
vercel env add SENTRY_AUTH_TOKEN
```

### 8.2 Vercel Analytics

Already included in the app. Just verify:
1. Go to Vercel Dashboard → Your Project → Analytics
2. You should see real-time visitor data

### 8.3 Uptime Monitoring

Set up free monitoring:
- [UptimeRobot](https://uptimerobot.com) - 50 monitors, 5-min checks
- [Pingdom](https://www.pingdom.com) - 14-day free trial
- [Better Stack](https://betterstack.com) - 10 monitors free

**Configure:**
- URL: `https://your-domain.com`
- Check interval: 5 minutes
- Alert email: your-email@example.com

---

## Step 9: Security Hardening

### 9.1 Verify Security Headers

```bash
curl -I https://your-domain.com | grep -E "(X-Frame|X-Content|Strict-Transport|Referrer-Policy|Permissions-Policy)"
```

Expected output:
```
x-frame-options: DENY
x-content-type-options: nosniff
strict-transport-security: max-age=31536000; includeSubDomains
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
```

### 9.2 Test Rate Limiting

```bash
# Test auth endpoint rate limit (5 requests per minute)
for i in {1..7}; do
  curl -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nRequest $i: HTTP %{http_code}\n"
done
```

Requests 6+ should return `429 Too Many Requests`.

### 9.3 Rotate API Keys

After initial setup, rotate these keys:
1. Supabase service role key
2. Stripe secret key
3. Resend API key
4. Sentry auth token

---

## Step 10: Final Verification

### 10.1 Functional Tests

| Feature | Test | Status |
|---------|------|--------|
| User Registration | Sign up with new email | ☐ |
| Email Verification | Click verification link | ☐ |
| Login | Login with credentials | ☐ |
| Family Creation | Create a new family | ☐ |
| Task Management | Create, assign, complete task | ☐ |
| Calendar | Add event, view calendar | ☐ |
| Chat | Send message, receive reply | ☐ |
| File Upload | Upload file, view in files | ☐ |
| Budget | Add expense, view budget | ☐ |
| Grocery | Add item, mark purchased | ☐ |
| Meal Plan | Create meal plan | ☐ |
| Milestones | Add birthday/anniversary | ☐ |
| Chores | Assign chore, mark done | ☐ |
| Settings | Update profile, change theme | ☐ |
| Admin Dashboard | Access via logo click | ☐ |

### 10.2 Performance Tests

```bash
# Test page load time
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://your-domain.com

# Test API response time
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://your-domain.com/api/health
```

Expected:
- Page load: < 2 seconds
- API response: < 500ms

### 10.3 Mobile Tests

Test on:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Tablet (Chrome)

Verify:
- Responsive layout
- Touch navigation (swipe between pages)
- Bottom navigation bar
- Keyboard doesn't break layout

---

## Troubleshooting

### Database Connection Failed
```bash
# Test connection
npx prisma db pull

# If fails, check DATABASE_URL format:
# postgresql://postgres.[project-ref]:[password]@[host]:[port]/postgres
```

### Rate Limiting Not Working
```bash
# Verify Redis connection
curl $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Should return: +PONG
```

### Admin Dashboard Not Accessible
```sql
-- Verify admin role in database
SELECT email, role FROM profiles WHERE role = 'admin';

-- If empty, grant admin role:
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## Next Steps

1. **Invite beta testers** - Share with 5-10 families
2. **Collect feedback** - Use admin dashboard to track usage
3. **Monitor errors** - Check Sentry daily
4. **Review analytics** - Check Vercel Analytics weekly
5. **Plan v2 features** - Based on user feedback

---

## Support

- **Documentation**: README.md
- **Deployment Guide**: DEPLOYMENT.md
- **Issues**: GitHub Issues
- **Admin Access**: Click logo 7 times on login page
