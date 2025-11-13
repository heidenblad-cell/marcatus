import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/assets': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
      '/crawl': 'http://localhost:4001'
    }
  }
})
