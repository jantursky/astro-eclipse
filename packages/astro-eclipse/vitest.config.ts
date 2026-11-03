import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/client/index.ts'],
      reporter: ['text-summary', 'text', 'html', 'lcov'],
      thresholds: { statements: 92, branches: 85, functions: 95, lines: 95 },
    },
  },
})
