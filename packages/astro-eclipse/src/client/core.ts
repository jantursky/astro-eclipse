import { SYSTEM, supportsSystem, type EclipseConfig } from '../config.js'
import type { Origin } from './origin.js'
import type { Direction } from './transitions.js'
import { noop, runTransition, watchNavigation } from './runner.js'

export interface ThemeChange {
  /** The theme that is applied now. Never `'system'`. */
  theme: string
  /** What the visitor chose: a theme name, or `'system'`. */
  preference: string
}

export interface SetThemeOptions {
  /** Effect name. Defaults to the config's `transition`. */
  transition?: string
  duration?: number
  easing?: string
  /** Where a reveal starts. Pass the click event. Default: the middle of the screen. */
  origin?: Origin
  /** Which way `wipe` and `blinds` travel. Default `'right'`. */
  direction?: Direction
}

export interface Eclipse {
  setTheme: (preference: string, options?: SetThemeOptions) => void
  toggleTheme: (options?: SetThemeOptions) => void
  /** The theme that is applied now. */
  getTheme: () => string
  /** What the visitor chose: a theme name, or `'system'`. */
  getPreference: () => string
  onThemeChange: (listener: (change: ThemeChange) => void) => () => void
}

export const CHANGE_EVENT = 'eclipse:change'

/**
 * The client API for one config. Reads and writes the same localStorage value and the same <html>
 * attribute as the inline head script, so the two never disagree.
 */
export function createEclipse(config: EclipseConfig): Eclipse {
  // The choice when the last write to localStorage failed (blocked storage, full quota). It wins over whatever
  // is stored until a write succeeds again, so the visitor's choice is never silently dropped.
  let unsaved: string | undefined
  if (typeof document !== 'undefined') watchNavigation()

  const isPreference = (value: string | null | undefined): boolean =>
    value != null && (value === SYSTEM ? supportsSystem(config) : config.themes.includes(value))

  function getPreference(): string {
    if (typeof document === 'undefined') return config.default
    let stored: string | null | undefined = unsaved
    if (stored === undefined) {
      try {
        stored = localStorage.getItem(config.storageKey)
      } catch {
        // Storage is unreadable and nothing was chosen yet: use the default.
      }
    }
    return stored != null && isPreference(stored) ? stored : config.default
  }

  function resolve(preference: string): string {
    if (preference !== SYSTEM) return preference
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function apply(theme: string): void {
    const root = document.documentElement
    if (config.attribute === 'class') {
      for (const name of config.themes) root.classList.toggle(name, name === theme)
    } else {
      root.setAttribute(config.attribute, theme)
    }
  }

  function getTheme(): string {
    return resolve(getPreference())
  }

  function emit(): void {
    const detail: ThemeChange = { theme: getTheme(), preference: getPreference() }
    document.dispatchEvent(new CustomEvent<ThemeChange>(CHANGE_EVENT, { detail }))
  }

  function setTheme(preference: string, options: SetThemeOptions = {}): void {
    if (typeof document === 'undefined') return
    if (!isPreference(preference)) {
      throw new RangeError(
        `astro-eclipse: unknown theme "${preference}". Known: ${[...config.themes, SYSTEM].join(', ')}.`,
      )
    }
    const before = getTheme()
    try {
      localStorage.setItem(config.storageKey, preference)
      unsaved = undefined
    } catch {
      unsaved = preference
    }

    // Applies whatever is stored when it runs, so overlapping calls always end on the latest choice.
    const update = (): void => {
      apply(getTheme())
      emit()
    }
    if (getTheme() === before) {
      update()
      return
    }
    runTransition(update, {
      name: options.transition ?? config.transition,
      duration: options.duration ?? config.duration,
      easing: options.easing ?? 'ease-in-out',
      origin: options.origin,
      direction: options.direction ?? 'right',
    })
  }

  function toggleTheme(options?: SetThemeOptions): void {
    const index = config.themes.indexOf(getTheme())
    setTheme(config.themes[(index + 1) % config.themes.length] ?? config.default, options)
  }

  function onThemeChange(listener: (change: ThemeChange) => void): () => void {
    if (typeof document === 'undefined') return noop
    const handler = (event: Event): void => {
      listener((event as CustomEvent<ThemeChange>).detail)
    }
    document.addEventListener(CHANGE_EVENT, handler)
    return () => {
      document.removeEventListener(CHANGE_EVENT, handler)
    }
  }

  return { setTheme, toggleTheme, getTheme, getPreference, onThemeChange }
}
