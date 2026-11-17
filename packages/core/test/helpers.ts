import { vi } from 'vitest'

/** Fake `matchMedia`: tests flip the reduced-motion query and fire `change`. */
export function mockMedia(initial: { reduce?: boolean } = {}) {
  const state = { reduce: initial.reduce ?? false }
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('prefers-reduced-motion') && state.reduce
    },
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  return {
    setReduce(reduce: boolean) {
      state.reduce = reduce
    },
  }
}

export function resetDom(): void {
  document.documentElement.className = ''
  document.head.innerHTML = ''
}
