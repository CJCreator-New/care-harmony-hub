import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { componentTagger } from 'lovable-tagger';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * SECF-04: Supabase responses carry PHI and must never reach Cache Storage.
 * These routes are registered as NetworkOnly so no future catch-all runtime
 * cache can pick them up. Covers the configured project origin (which may be a
 * custom domain), any *.supabase.co / *.supabase.in host, and the Supabase API
 * path prefixes on any origin (self-hosted / proxied deployments).
 */
const supabaseNetworkOnlyPatterns = (supabaseUrl: string | undefined): RegExp[] => {
  const patterns: RegExp[] = [
    /^https:\/\/[^/]+\.supabase\.(co|in)\//i,
    /^https?:\/\/[^/]+\/(auth|rest|storage|functions|realtime|graphql)\/v1\//i,
  ];
  try {
    if (supabaseUrl) {
      patterns.unshift(new RegExp(`^${escapeRegExp(new URL(supabaseUrl).origin)}/`, 'i'));
    }
  } catch {
    // Invalid URL: the generic patterns above still apply.
  }
  return patterns;
};

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'AROCORD-HIMS',
        short_name: 'AROCORD',
        description: 'Complete Hospital Management System with offline capabilities',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['medical', 'healthcare', 'productivity'],
        lang: 'en-US',
        orientation: 'portrait-primary',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SECF-04: never cache Supabase (PHI) responses. Static assets are
        // still precached via globPatterns above.
        runtimeCaching: supabaseNetworkOnlyPatterns(
          process.env.VITE_SUPABASE_URL ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL
        ).map((urlPattern) => ({
          urlPattern,
          handler: 'NetworkOnly' as const,
        })),
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Disable PWA service worker in dev: the SW's WebSocket client hardcodes the
        // initial port and fails when Vite falls back to an alternate port (e.g. 8081).
        // Production builds retain full PWA/offline capability unaffected.
        enabled: false,
      },
    }),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: {
          // Router
          router: ['react-router-dom'],

          // UI components (split large ones)
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],

          // Charts (lazy load these heavy libraries)
          charts: ['recharts'],

          // Supabase
          supabase: ['@supabase/supabase-js'],

          // Query management
          tanstack: ['@tanstack/react-query'],

          // Forms
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Date utilities
          dates: ['date-fns'],

          // Animations
          motion: ['framer-motion'],

          // Icons
          icons: ['lucide-react'],

          // Utilities
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    // Performance optimizations
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    cssCodeSplit: true,
  },
  server: {
    host: '::',
    port: 8080,
    hmr: {
      port: 8080,
    },
    headers: {
      // ws://localhost:* covers any port vite picks (e.g. 8080 or 8081 when the primary port is in use)
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:*; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
}));
