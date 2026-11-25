import { onMount } from 'svelte'
import { writable, type Readable } from 'svelte/store'

import { getPreference, getSystemTheme, getTheme, onThemeChange, themes } from './client/index.js'

/**
 * The applied theme, the visitor's preference, the configured themes and the system theme. The three values
 * are Svelte stores (use `$theme`), `undefined` until the component mounts so the server render and the first
 * client render agree. Works in Svelte 4 and 5.
 */
export function useTheme() {
  const theme = writable<string | undefined>()
  const preference = writable<string | undefined>()
  const systemTheme = writable<'light' | 'dark' | undefined>()

  onMount(() => {
    const sync = () => {
      theme.set(getTheme())
      preference.set(getPreference())
      systemTheme.set(getSystemTheme())
    }
    sync()
    return onThemeChange(sync)
  })

  return {
    theme: readonly(theme),
    preference: readonly(preference),
    themes,
    systemTheme: readonly(systemTheme),
  }
}

const readonly = <T>(store: Readable<T>): Readable<T> => ({ subscribe: store.subscribe })
