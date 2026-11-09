// Stands in for the `virtual:astro-eclipse/config` module that the integration serves, so tests can load
// `src/client/index.ts` and the modules that import from it.
export default {
  themes: ['light', 'dark', 'sepia'],
  default: 'light',
  attribute: 'data-theme' as const,
  storageKey: 'eclipse-theme',
  transition: 'circle',
  duration: 0,
}
