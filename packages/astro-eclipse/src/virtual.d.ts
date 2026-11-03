// Keep in step with `EclipseConfig` in config.ts. Relative imports are not allowed in an ambient module.
declare module 'virtual:astro-eclipse/config' {
  const config: {
    themes: string[]
    default: string
    attribute: 'class' | `data-${string}`
    storageKey: string
    transition: string
    duration: number
  }
  export default config
}

// Only so this package can compile `export ... from './ThemeToggle.astro'`. Consumers get the real type from `astro/client`.
declare module '*.astro' {
  const component: unknown
  export default component
}
