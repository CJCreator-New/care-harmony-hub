#!/bin/bash

# Supabase Migration Deployment Script
# This script helps deploy migrations to Supabase when CLI linking fails

echo "🚀 Supabase Migration Deployment Script"
echo "========================================"

# Project Configuration
PROJECT_REF="wmxtzkrkscjwixafumym"
SUPABASE_URL="https://wmxtzkrkscjwixafumym.supabase.co"

echo "📋 Project: $PROJECT_REF"
echo "🌐 URL: $SUPABASE_URL"
echo ""

# Check if migrations directory exists
if [ ! -d "supabase/migrations" ]; then
    echo "❌ Error: supabase/migrations directory not found"
    exit 1
fi

echo "📁 Found migrations directory"
echo "📊 Migration files to deploy:"
echo ""

# List all migration files
ls -la supabase/migrations/*.sql | while read -r line; do
    filename=$(basename "$line")
    echo "   📄 $filename"
done

echo ""
echo "🔧 Deployment Options:"
echo ""
echo "Option 1: Manual Supabase Dashboard Deployment"
echo "   1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo "   2. Copy and paste each migration file content"
echo "   3. Run them in chronological order"
echo ""
echo "Option 2: CLI with Database Password"
echo "   1. Get your database password from Supabase Dashboard > Settings > Database"
echo "   2. Run: supabase link --project-ref $PROJECT_REF --password YOUR_PASSWORD"
echo "   3. Run: supabase db push"
echo ""
echo "Option 3: Direct PostgreSQL Connection"
echo "   1. Get connection string from Supabase Dashboard"
echo "   2. Use psql to connect and run migrations"
echo ""

# Create a combined migration file for easy deployment
echo "📦 Creating combined migration file..."

COMBINED_FILE="combined_migrations_$(date +%Y%m%d_%H%M%S).sql"

echo "-- Combined Migrations for Supabase Deployment" > "$COMBINED_FILE"
echo "-- Generated on: $(date)" >> "$COMBINED_FILE"
echo "-- Project: $PROJECT_REF" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Combine all migrations in order
for migration_file in supabase/migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        filename=$(basename "$migration_file")
        echo "-- ============================================" >> "$COMBINED_FILE"
        echo "-- Migration: $filename" >> "$COMBINED_FILE"
        echo "-- ============================================" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        cat "$migration_file" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
    fi
done

echo "✅ Combined migration file created: $COMBINED_FILE"
echo ""
echo "🎯 Quick Deploy Instructions:"
echo "   1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo "   2. Copy the contents of: $COMBINED_FILE"
echo "   3. Paste and run in SQL Editor"
echo "   4. Verify tables are created successfully"
echo ""
echo "🔍 Critical Tables to Verify After Deployment:"
echo "   ✓ hospitals"
echo "   ✓ profiles" 
echo "   ✓ user_roles"
echo "   ✓ patients"
echo "   ✓ appointments"
echo "   ✓ consultations"
echo "   ✓ prescriptions"
echo "   ✓ lab_orders"
echo "   ✓ invoices"
echo "   ✓ payments"
echo ""
echo "🚨 After deployment, test the P0 critical issues:"
echo "   P0-001: Doctor consultation date validation"
echo "   P0-002: Patient portal RBAC"
echo "   P0-003: Doctor → Pharmacy sync"
echo "   P0-004: Doctor → Lab sync" 
echo "   P0-005: Receptionist invoice creation"
echo ""
echo "📞 Need help? Check the deployment logs and verify RLS policies are active."