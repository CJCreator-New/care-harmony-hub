#!/bin/bash

set -e

# Configuration
PROJECT_NAME="caresync-hms"
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "🚀 Starting deployment for $PROJECT_NAME ($ENVIRONMENT)"

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if required environment variables are set
required_vars=("SUPABASE_PROJECT_ID" "SUPABASE_ACCESS_TOKEN" "VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

# Run tests
echo "🧪 Running tests..."
npm run test:unit
npm run test:e2e:critical

# Security audit
echo "🔒 Running security audit..."
npm audit --audit-level=high

# Build application
echo "🏗️ Building application..."
npm run build

# Deploy Supabase functions
echo "☁️ Deploying Supabase functions..."
npx supabase functions deploy --project-ref $SUPABASE_PROJECT_ID

# Run database migrations
echo "🗄️ Running database migrations..."
npx supabase db push --project-ref $SUPABASE_PROJECT_ID

# Build and push Docker image
echo "🐳 Building Docker image..."
docker build -t $PROJECT_NAME:$VERSION .

if [ "$ENVIRONMENT" = "production" ]; then
    # Tag for production
    docker tag $PROJECT_NAME:$VERSION $PROJECT_NAME:production
    
    # Deploy to production (customize based on your infrastructure)
    echo "🌐 Deploying to production..."
    
    # Example: Deploy to cloud provider
    # docker push your-registry/$PROJECT_NAME:production
    # kubectl set image deployment/$PROJECT_NAME $PROJECT_NAME=your-registry/$PROJECT_NAME:production
    
    # Health check
    echo "🏥 Running health checks..."
    sleep 30
    curl -f http://localhost/health || exit 1
    
    echo "✅ Production deployment completed successfully!"
    
elif [ "$ENVIRONMENT" = "staging" ]; then
    # Deploy to staging
    echo "🧪 Deploying to staging..."
    docker tag $PROJECT_NAME:$VERSION $PROJECT_NAME:staging
    
    # Run smoke tests
    echo "💨 Running smoke tests..."
    npm run test:smoke:staging
    
    echo "✅ Staging deployment completed successfully!"
fi

# Post-deployment notifications
echo "📢 Sending deployment notifications..."

# Slack notification (if webhook is configured)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🎉 CareSync HMS deployed successfully to $ENVIRONMENT (version: $VERSION)\"}" \
        $SLACK_WEBHOOK_URL
fi

echo "🎉 Deployment completed successfully!"