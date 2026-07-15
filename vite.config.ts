import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages needs the repository prefix in built asset URLs. Keep the
  // development server rooted at `/`, including in Actions, so Playwright's
  // secondary HTML entry points resolve exactly as they do locally.
  base: command === 'build' && process.env.GITHUB_ACTIONS
    ? '/my-room-decoration/'
    : '/',
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4188,
    strictPort: true,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 750,
  },
}));
