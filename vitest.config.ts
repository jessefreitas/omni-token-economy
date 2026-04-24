import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/ts/**/*.test.ts'],
    reporters: ['default'],
    globals: false,
    testTimeout: 10_000,
  },
});
