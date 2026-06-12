import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('/@supabase/') || id.includes('/firebase/') || id.includes('/@capacitor/')) {
            return 'vendor-platform';
          }
          if (id.includes('/leaflet/') || id.includes('/react-leaflet/')) {
            return 'vendor-map';
          }
          if (id.includes('/xlsx/')) {
            return 'vendor-xlsx';
          }
          if (id.includes('/html2canvas/')) {
            return 'vendor-html2canvas';
          }
          if (id.includes('/jspdf') || id.includes('/jspdf-autotable/')) {
            return 'vendor-jspdf';
          }
          if (id.includes('/pdf-lib/')) {
            return 'vendor-pdf-lib';
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }

          return 'vendor-misc';
        }
      }
    }
  },
})
