import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        catalogo: resolve(__dirname, 'catalogo.html')
      }
    }
  },
  server: {
    port: 5173
  }
})
