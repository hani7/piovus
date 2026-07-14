import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('zustand') || id.includes('axios')) {
              return 'vendor';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('xlsx')) {
              return 'excel';
            }
          }
        }
      }
    }
  }
})
