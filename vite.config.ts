/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // The rules engine is pure TypeScript, so tests run in plain Node.
    // Switch to 'jsdom' per file if component tests arrive later.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
