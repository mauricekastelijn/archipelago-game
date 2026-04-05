import { defineConfig } from 'vite';

// Change `base` before publishing to GitHub Pages under a repo path.
// Example: /my-awesome-game/
export default defineConfig({
  base: '/phaser-game-template/',
  build: {
    // Phaser is the dominant client dependency in this template, so the default
    // 500 kB warning is too low to be useful for the initial starter build.
    chunkSizeWarningLimit: 1500
  },
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
});
