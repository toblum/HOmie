import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    css: true,
    environment: 'jsdom',
    exclude: ['tests/e2e/**', 'node_modules/**'],
    setupFiles: './src/test/setup.ts',
  },
})
