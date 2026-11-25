import { createSignal, onCleanup, onMount } from 'solid-js'

import { getPreference, getSystemTheme, getTheme, onThemeChange, themes } from './client/index.js'

/**
 * The applied theme, the visitor's preference, the configured themes and the system theme. `theme`,
 * `preference` and `systemTheme` are signals (call them: `theme()`), `undefined` until the component mounts.
 */
export function useTheme() {
  const [theme, setCurrentTheme] = createSignal<string>()
  const [preference, setCurrentPreference] = createSignal<string>()
  const [systemTheme, setCurrentSystemTheme] = createSignal<'light' | 'dark'>()

  onMount(() => {
    const sync = () => {
      setCurrentTheme(getTheme())
      setCurrentPreference(getPreference())
      setCurrentSystemTheme(getSystemTheme())
    }
    sync()
    onCleanup(onThemeChange(sync))
  })

  return { theme, preference, themes, systemTheme }
}
