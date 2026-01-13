import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
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
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-popover',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          tanstack: ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          dates: ['date-fns'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: "::",
    port: 8080,
  },
}));
