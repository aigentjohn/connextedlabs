import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Simulate a browser environment for React hooks and components
    environment: 'jsdom',
    // Makes describe/it/expect available without importing them in every file
    globals: true,
    // Runs before every test file — sets up jest-dom matchers
    setupFiles: ['./src/__tests__/setup.ts'],
    // Only run files in the __tests__ folder
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // Shows coverage in terminal and generates an HTML report in coverage/
      reporter: ['text', 'html'],
      // Only measure coverage for services and hooks — not components or pages
      include: ['src/services/**', 'src/hooks/**'],
      exclude: ['src/__tests__/**'],
    },
  },
  resolve: {
    // Allows tests to use @/ imports the same way the app does
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
