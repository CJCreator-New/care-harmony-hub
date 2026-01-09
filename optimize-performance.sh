#!/bin/bash

# CareSync HMS - Performance Optimization Script
# This script implements critical performance improvements

echo "🚀 CareSync HMS Performance Optimization Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing performance optimization dependencies..."

# Install performance optimization packages
npm install --save-dev \
    vite-bundle-analyzer \
    rollup-plugin-visualizer \
    @vitejs/plugin-legacy \
    workbox-webpack-plugin \
    compression-webpack-plugin

print_status "Performance dependencies installed"

echo "🔧 Updating Vite configuration for optimal bundling..."

# Create optimized vite config
cat > vite.config.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from 'rollup-plugin-visualizer';
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "CareSync HMS - Hospital Management System",
        short_name: "CareSync HMS",
        description: "Comprehensive Hospital Management System for healthcare facilities",
        theme_color: "#0ea5e9",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
    }),
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
    sourcemap: mode === 'development'
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react'
    ]
  }
}));
EOF

print_status "Vite configuration optimized"

echo "📊 Adding bundle analysis scripts..."

# Update package.json with new scripts
npm pkg set scripts.analyze="npx vite-bundle-analyzer dist"
npm pkg set scripts.build:analyze="npm run build && npm run analyze"
npm pkg set scripts.perf="npm run build:analyze"

print_status "Bundle analysis scripts added"

echo "🗜️  Adding compression configuration..."

# Create compression configuration
cat > .gzip.config.js << 'EOF'
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  plugins: [
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8
    }),
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8
    })
  ]
};
EOF

print_status "Compression configuration added"

echo "🔍 Running initial bundle analysis..."

# Build and analyze
npm run build

if [ $? -eq 0 ]; then
    print_status "Build completed successfully"
    npm run analyze
else
    print_error "Build failed"
    exit 1
fi

echo ""
echo "🎯 Performance Optimization Results:"
echo "===================================="

# Get bundle size
if [ -f "dist/stats.html" ]; then
    echo "📊 Bundle analysis report generated: dist/stats.html"
fi

# Check bundle size
if [ -f "dist/assets/index-*.js" ]; then
    BUNDLE_SIZE=$(ls -lh dist/assets/index-*.js | awk '{print $5}')
    echo "📦 Main bundle size: $BUNDLE_SIZE"
fi

echo ""
print_status "Performance optimization completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Review the bundle analysis report: dist/stats.html"
echo "2. Implement lazy loading for large components"
echo "3. Add image optimization for medical images"
echo "4. Implement service worker caching strategies"
echo "5. Add performance monitoring in production"
echo ""
echo "🔧 Available Commands:"
echo "  npm run build:analyze  - Build and analyze bundle"
echo "  npm run perf          - Run performance checks"
echo "  npm run analyze       - Analyze existing build"</content>
<parameter name="filePath">c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub\optimize-performance.sh