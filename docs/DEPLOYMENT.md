# Deployment Guide

## Overview

CareSync can be deployed via Lovable's built-in publishing or self-hosted on various platforms.

---

## Lovable Publishing (Recommended)

### Quick Deploy

1. Open your project in Lovable
2. Click **Share** → **Publish**
3. Click **Update** to deploy changes
4. Access via `yourapp.lovable.app`

### Custom Domain

1. Go to **Project** → **Settings** → **Domains**
2. Click **Connect Domain**
3. Add DNS records as instructed:
   - CNAME: `yoursite.lovable.app`
   - Or A record for apex domains
4. Wait for SSL certificate provisioning

---

## Self-Hosted Deployment

### Prerequisites

- Node.js 18+
- npm or bun
- Git
- Hosting platform account
- PostgreSQL 15+ (provided via Supabase; not required to install separately)

> Before deploying, review the environment configuration section below and set all required variables.

### Build Process

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd caresync

# Install dependencies
npm install

# Build for production
npm run build

# Output in /dist folder
```

### Environment Variables

Create `.env.production`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## Platform-Specific Guides

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

**vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Production deploy
netlify deploy --prod
```

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Docker

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Build and run
docker build -t caresync .
docker run -p 80:80 caresync
```

### AWS S3 + CloudFront

1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://caresync-app
   aws s3 website s3://caresync-app --index-document index.html --error-document index.html
   ```

2. **Upload Build**:
   ```bash
   aws s3 sync dist/ s3://caresync-app --delete
   ```

3. **Create CloudFront Distribution**:
   - Origin: S3 bucket
   - Default root object: index.html
   - Error pages: 404 → /index.html (200)

---

## CI/CD Pipeline

### GitHub Actions

**.github/workflows/deploy.yml**:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Edge Functions Deployment

Edge functions are automatically deployed when using Lovable Cloud.

For manual deployment:
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy appointment-reminders
```

---

## Database Migrations

Migrations are managed through Lovable Cloud. For manual migrations:

```bash
# Apply migrations
supabase db push

# Reset database (caution!)
supabase db reset
```

---

## Monitoring

### Health Checks

Implement a health endpoint:
```typescript
// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Recommended Tools

- **Uptime**: UptimeRobot, Pingdom
- **Errors**: Sentry, LogRocket
- **Analytics**: Lovable Analytics, Plausible
- **Performance**: Lighthouse CI

---

## Rollback Procedures

### Lovable

1. Go to version history
2. Select previous working version
3. Click "Restore"

### Git-based

```bash
# Revert to previous commit
git revert HEAD
git push

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force
```

### Database

```sql
-- Point-in-time recovery (Supabase Pro)
-- Contact Supabase support for PITR

-- Manual rollback via migrations
-- Create reverse migration
```

---

## Performance Optimization

### Build Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
        }
      }
    }
  }
});
```

### Caching Strategy

```nginx
# Static assets - 1 year
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML - no cache
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-store, must-revalidate";
}
```

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] Dependencies audited

---

## First-Time Admin Setup

Follow these steps **once** when deploying CareSync to a new Supabase project. Steps marked 🔐 require Supabase dashboard access.

### Step 1 — Apply Database Migrations (in order)

```bash
# From the project root
supabase db push

# Or apply individually if targeting a remote project:
supabase migration up --db-url "postgresql://postgres:<password>@db.<project-id>.supabase.co:5432/postgres"
```

Key migrations and their order:

| Migration file | Purpose |
|---------------|---------|
| `20260209100000_m3_rls_hardening.sql` | Row Level Security policies on all 46 tables |
| `20260223000001_perf_indexes.sql` | Performance indexes on appointments, notifications, patient_queue |
| `20260224000001_register_patient_atomic.sql` | Atomic `register_patient()` RPC function |
| `20260224000002_feature_flags.sql` | `feature_flags` table + per-hospital seeds |

### Step 2 — Set Required Secrets 🔐

In the Supabase dashboard → **Settings** → **Edge Functions** → **Secrets**, add:

| Secret name | Description | Required |
|-------------|-------------|---------|
| `TWO_FACTOR_ENCRYPTION_KEY` | 32-byte AES-GCM key (base64-encoded) for 2FA secret storage | ✅ |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins (e.g., `https://yourapp.com`) | ✅ |
| `SMTP_HOST` | SMTP server hostname for `send-email` function | Optional |
| `SMTP_PORT` | SMTP server port | Optional |
| `SMTP_USER` | SMTP username | Optional |
| `SMTP_PASS` | SMTP password | Optional |
| `OPENAI_API_KEY` | OpenAI key for `ai-clinical-support` / `symptom-analysis` | Optional |

Generate the `TWO_FACTOR_ENCRYPTION_KEY`:
```bash
# Generate a random 32-byte key and base64-encode it
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 3 — Enable Auth Security Settings 🔐

In the Supabase dashboard → **Authentication** → **Providers**:

1. ✅ Enable **"Prevent use of leaked passwords"** (HaveIBeenPwned check)
2. Set **minimum password length** to 8
3. Enable **"Confirm email"** for new sign-ups
4. Set **JWT expiry** to 3600 (1 hour) for production

### Step 4 — Deploy Edge Functions

```bash
# Deploy all functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy store-2fa-secret
supabase functions deploy verify-2fa
supabase functions deploy generate-2fa-secret
supabase functions deploy verify-totp
supabase functions deploy verify-backup-code
supabase functions deploy create-hospital-admin
supabase functions deploy accept-invitation-signup
supabase functions deploy validate-invitation-token
supabase functions deploy send-notification
supabase functions deploy send-email
supabase functions deploy appointment-reminders
supabase functions deploy ai-clinical-support
supabase functions deploy symptom-analysis
supabase functions deploy predict-deterioration
supabase functions deploy clinical-pharmacy
supabase functions deploy lab-critical-values
supabase functions deploy lab-automation
supabase functions deploy optimize-queue
supabase functions deploy workflow-automation
supabase functions deploy analytics-engine
supabase functions deploy fhir-integration
supabase functions deploy insurance-integration
supabase functions deploy telemedicine
supabase functions deploy health-check
supabase functions deploy monitoring
supabase functions deploy system-monitoring
supabase functions deploy audit-logger
supabase functions deploy backup-manager
supabase functions deploy check-low-stock
```

### Step 5 — Verify Security Configuration

```bash
# Run security test suite — should pass 27/27
npm run test:security

# Run accessibility tests
npm run test:accessibility

# Run RLS gate tests
npx vitest run tests/security/p0-db-rls-gates.test.ts
```

### Step 6 — Create First Hospital & Admin

Use the `create-hospital-admin` edge function (requires service role key):

```bash
curl -X POST "https://<project-id>.supabase.co/functions/v1/create-hospital-admin" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "hospitalName": "My Hospital",
    "adminEmail": "admin@myhospital.com",
    "adminPassword": "SecurePassword123!",
    "adminFirstName": "Admin",
    "adminLastName": "User"
  }'
```

### Step 7 — Enable Feature Flags (Optional)

Feature flags are seeded as **disabled** by default. Enable them per-hospital in the `feature_flags` table:

```sql
-- Enable all v2 flows for a specific hospital
UPDATE feature_flags
SET enabled = true
WHERE hospital_id = '<your-hospital-uuid>';

-- Or enable one flag at a time
UPDATE feature_flags
SET enabled = true
WHERE hospital_id = '<your-hospital-uuid>'
  AND flag_name = 'patient_portal_v2';
```

See `plans/FEATURE_FLAG_ROLLBACK_PROCEDURES.md` for the full rollout and rollback playbook.

---

### Common Issues

| Issue | Solution |
|-------|----------|
| Blank page after deploy | Check base URL, SPA routing |
| API calls failing | Verify environment variables |
| CSS not loading | Check asset paths |
| 404 on refresh | Configure SPA fallback |

### Debug Checklist

1. Check browser console for errors
2. Verify network requests in DevTools
3. Check environment variables are set
4. Verify build completed successfully
5. Check hosting platform logs
