import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Svelte and Solid ship a server and a browser build; the tests drive components in the DOM.
    conditions: ['browser'],
    alias: { 'virtual:astro-eclipse/config': fileURLToPath(new URL('test/virtual-config.ts', import.meta.url)) },
  },
  test: {
    server: { deps: { inline: [/solid-js/, /svelte/] } },
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    typecheck: { enabled: true, include: ['test/**/*.test-d.ts'] },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/client/index.ts'],
      reporter: ['text-summary', 'text', 'html', 'lcov'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
