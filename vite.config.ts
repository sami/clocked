/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /*
     * Offline.
     *
     * Once loaded, the app never needs the network. Opening it without one
     * is the part that needs help, so every built asset is precached and
     * served from there. Nothing is fetched from anywhere else.
     *
     * Caveat worth knowing: a machine that clears site data at logout takes
     * this cache with it, so the app needs one connected load per session
     * before it can run offline again.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        // No runtime caching rules, because there is nothing to fetch.
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'Clocked',
        short_name: 'Clocked',
        description: 'A timesheet calculator for clockings that arrive incomplete.',
        theme_color: '#0b1120',
        background_color: '#0b1120',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    // The rules engine is pure TypeScript, so tests run in plain Node.
    // Switch to 'jsdom' per file if component tests arrive later.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
