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
  /** Sets `color-scheme` on `<html>` per theme, so native controls and scrollbars match. Default: not set. */
  colorScheme?: Record<string, ColorScheme>
  /** Sets `<meta name="theme-color">` per theme, e.g. `{ dark: '#111' }`. Default: not set. */
  themeColor?: Record<string, string>
  /** Lets any element with `data-eclipse-set="<theme>"` switch the theme on click. Adds a small script to every page. Default: false. */
  headless?: boolean
}

export type ColorScheme = 'light' | 'dark'

export interface EclipseConfig {
  themes: string[]
  default: string
  attribute: 'class' | `data-${string}`
  storageKey: string
  transition: string
  duration: number
  colorScheme?: Record<string, ColorScheme>
  themeColor?: Record<string, string>
  headless?: true
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
    ...(options.colorScheme && { colorScheme: options.colorScheme }),
    ...(options.themeColor && { themeColor: options.themeColor }),
    ...(options.headless === true && { headless: true as const }),
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
  if (options.headless !== undefined && typeof options.headless !== 'boolean') {
    throw new Error('astro-eclipse: `headless` must be true or false.')
  }
  checkKeys('colorScheme', config.colorScheme, themes)
  checkKeys('themeColor', config.themeColor, themes)
  for (const [theme, value] of Object.entries<string>(config.colorScheme ?? {})) {
    if (value !== 'light' && value !== 'dark') {
      throw new Error(`astro-eclipse: \`colorScheme.${theme}\` must be "light" or "dark", got "${value}".`)
    }
  }
  for (const [theme, value] of Object.entries(config.themeColor ?? {})) {
    if (typeof value !== 'string' || value.trim() === '' || value.includes('<')) {
      throw new Error(`astro-eclipse: \`themeColor.${theme}\` must be a non-empty CSS color without "<".`)
    }
  }
  return config
}

function checkKeys(option: string, map: Record<string, unknown> | undefined, themes: string[]): void {
  for (const key of Object.keys(map ?? {})) {
    if (!themes.includes(key)) throw new Error(`astro-eclipse: \`${option}\` key "${key}" is not in \`themes\`.`)
  }
}

export function supportsSystem(config: Pick<EclipseConfig, 'themes'>): boolean {
  return config.themes.includes('light') && config.themes.includes('dark')
}
