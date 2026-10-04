import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['api/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    reporters: ['default', 'junit'],
    outputFile: { junit: 'reports/api-junit.xml' },
  },
});
