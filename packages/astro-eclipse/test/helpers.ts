import { vi } from 'vitest'

import { resolveConfig, type EclipseOptions } from '../src/config.js'

/** Fake `matchMedia`: tests flip the two queries the library reads and fire `change`. */
export function mockMedia(initial: { dark?: boolean; reduce?: boolean } = {}) {
  const state = { dark: initial.dark ?? false, reduce: initial.reduce ?? false }
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('prefers-reduced-motion') ? state.reduce : query.includes('dark') && state.dark
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }))
  return {
    setDark(dark: boolean) {
      state.dark = dark
      listeners.forEach((listener) => {
        listener()
      })
    },
    setReduce(reduce: boolean) {
      state.reduce = reduce
    },
  }
}

export const config = (options?: EclipseOptions) => resolveConfig(options)

export function resetDom(): void {
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-astro-transition')
  document.documentElement.className = ''
  document.head.innerHTML = ''
  localStorage.clear()
}
