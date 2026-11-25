import { useSyncExternalStore } from 'react'

import { getPreference, getSystemTheme, getTheme, onThemeChange, themes } from './client/index.js'

const subscribe = (notify: () => void) =>
  onThemeChange(() => {
    notify()
  })

/**
 * The applied theme, the visitor's preference, the configured themes and the system theme, as React state.
 * `theme`, `preference` and `systemTheme` are `undefined` on the server and during hydration so the first client
 * render matches the server HTML; the real values arrive right after.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => undefined)
  const preference = useSyncExternalStore(subscribe, getPreference, () => undefined)
  const systemTheme = useSyncExternalStore(subscribe, getSystemTheme, () => undefined)
  return { theme, preference, themes, systemTheme }
}
