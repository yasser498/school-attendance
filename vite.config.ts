
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'مدرسة عماد الدين زنكي',
        short_name: 'عماد الدين زنكي',
        description: 'نظام إدارة الغياب المدرسي - متوسطة عماد الدين زنكي',
        theme_color: '#1e3a8a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://www.raed.net/img?id=1474031',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://www.raed.net/img?id=1474031',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true
  }
});
