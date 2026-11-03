export interface EclipseOptions {
  /** Theme names. Each one becomes a value of `attribute` (or a class). Default `['light', 'dark']`. */
  themes?: string[]
  /** Theme to use before the visitor picks one, or `'system'` to follow `prefers-color-scheme`. Default `'system'`. */
  default?: string
  /** `'class'` toggles a class on `<html>`; `'data-*'` sets that attribute. Default `'data-theme'`. */
  attribute?: 'class' | `data-${string}`
  /** localStorage key that holds the visitor's choice. Default `'eclipse-theme'`. */
  storageKey?: string
  /** Effect used when a call does not name one. Default `'circle'`. */
  transition?: string
  /** Effect duration in milliseconds. Default `500`. */
  duration?: number
}

export interface EclipseConfig {
  themes: string[]
  default: string
  attribute: 'class' | `data-${string}`
  storageKey: string
  transition: string
  duration: number
}

/** The value that follows `prefers-color-scheme`. Needs the themes `light` and `dark`. */
export const SYSTEM = 'system'

const NAME = /^[a-z][a-z0-9-]*$/i
const ATTRIBUTE = /^(class|data-[a-z][a-z0-9-]*)$/

export function resolveConfig(options: EclipseOptions = {}): EclipseConfig {
  const themes = options.themes ?? ['light', 'dark']
  const config: EclipseConfig = {
    themes,
    default: options.default ?? SYSTEM,
    attribute: options.attribute ?? 'data-theme',
    storageKey: options.storageKey ?? 'eclipse-theme',
    transition: options.transition ?? 'circle',
    duration: options.duration ?? 500,
  }

  if (themes.length === 0) throw new Error('astro-eclipse: `themes` needs at least one theme.')
  for (const theme of themes) {
    if (!NAME.test(theme)) {
      throw new Error(
        `astro-eclipse: invalid theme name "${theme}". Use letters, digits and dashes, starting with a letter.`,
      )
    }
    if (theme === SYSTEM) throw new Error('astro-eclipse: "system" is reserved and cannot be a theme name.')
  }
  if (new Set(themes).size !== themes.length) throw new Error('astro-eclipse: `themes` contains duplicates.')
  if (!supportsSystem(config) && config.default === SYSTEM) {
    throw new Error('astro-eclipse: `default: "system"` needs the themes "light" and "dark".')
  }
  if (config.default !== SYSTEM && !themes.includes(config.default)) {
    throw new Error(`astro-eclipse: \`default\` "${config.default}" is not in \`themes\`.`)
  }
  if (!ATTRIBUTE.test(config.attribute)) {
    throw new Error(`astro-eclipse: \`attribute\` must be "class" or "data-*", got "${config.attribute}".`)
  }
  if (config.storageKey === '') throw new Error('astro-eclipse: `storageKey` cannot be empty.')
  if (!Number.isFinite(config.duration) || config.duration < 0) {
    throw new Error('astro-eclipse: `duration` must be a number of milliseconds, 0 or more.')
  }
  return config
}

export function supportsSystem(config: Pick<EclipseConfig, 'themes'>): boolean {
  return config.themes.includes('light') && config.themes.includes('dark')
}
