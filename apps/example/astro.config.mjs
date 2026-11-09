import { defineConfig } from 'astro/config'
import eclipse from 'astro-eclipse'

export default defineConfig({
  integrations: [
    eclipse({
      themes: ['light', 'dark', 'sepia', 'forest'],
      default: 'system',
      headless: true,
      forcedTheme: true,
      disableCssTransitions: true,
      attribute: 'data-theme',
      colorScheme: { light: 'light', dark: 'dark', sepia: 'light', forest: 'dark' },
      themeColor: { light: '#ffffff', dark: '#111111', sepia: '#f4ecd8', forest: '#10241a' },
    }),
  ],
})
