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

## Troubleshooting

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
