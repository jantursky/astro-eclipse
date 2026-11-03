import { defineConfig } from 'astro/config'
import eclipse from 'astro-eclipse'

export default defineConfig({
  integrations: [
    eclipse({
      themes: ['light', 'dark', 'sepia', 'forest'],
      default: 'system',
      attribute: 'data-theme',
    }),
  ],
})
