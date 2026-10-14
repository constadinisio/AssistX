import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.int.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    setupFiles: ['test/setupEnv.ts'],
    // Todos los archivos comparten la base assistx_test: sin paralelismo entre archivos.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
