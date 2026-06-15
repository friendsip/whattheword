import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Backend unit tests only — the client/ app is tested via react-scripts.
    include: ['lib/**/*.test.js', 'api/**/*.test.js'],
    environment: 'node',
  },
});
