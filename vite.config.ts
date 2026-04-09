import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/marktguru': {
        target: 'https://api.marktguru.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/marktguru/, '/api/v1'),
      },
    },
  },
})
