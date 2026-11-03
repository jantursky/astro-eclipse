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
