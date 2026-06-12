import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Integration suites self-skip when SPINE_DATABASE_URL is unset (see tests/integration/*).
  },
});
