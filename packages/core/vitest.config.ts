import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      reporter: ['text-summary', 'text', 'html', 'lcov'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
