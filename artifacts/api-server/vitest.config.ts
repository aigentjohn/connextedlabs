import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment for the Express server — no browser simulation needed
    environment: 'node',
    globals: true,
    // Sets required environment variables before any module loads
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only measure coverage for routes — the parts most critical to test
      include: ['src/routes/**'],
      exclude: ['src/__tests__/**'],
    },
  },
});
