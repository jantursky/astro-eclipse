import { onMounted, onUnmounted, readonly, ref } from 'vue'

import { getPreference, getSystemTheme, getTheme, onThemeChange, themes } from './client/index.js'

/**
 * The applied theme, the visitor's preference, the configured themes and the system theme, as Vue refs.
 * The refs are `undefined` until the component mounts, so the server render and the first client render agree.
 */
export function useTheme() {
  const theme = ref<string>()
  const preference = ref<string>()
  const systemTheme = ref<'light' | 'dark'>()
  let stop: (() => void) | undefined

  const sync = () => {
    theme.value = getTheme()
    preference.value = getPreference()
    systemTheme.value = getSystemTheme()
  }

  onMounted(() => {
    sync()
    stop = onThemeChange(sync)
  })
  onUnmounted(() => stop?.())

  return { theme: readonly(theme), preference: readonly(preference), themes, systemTheme: readonly(systemTheme) }
}
