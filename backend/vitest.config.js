import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.js'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/index.js',
        'src/config/db.js',
      ],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
});
