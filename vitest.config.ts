import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    include: ['tests/**/*.test.ts'],
    // Run each test file in an isolated worker thread and randomize order so
    // hidden inter-test/order dependencies surface early.
    pool: 'threads',
    isolate: true,
    poolOptions: {
      threads: {
        isolate: true,
      },
    },
    sequence: {
      shuffle: true,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['cli_utils/**/*.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
      },
    },
  },
});
