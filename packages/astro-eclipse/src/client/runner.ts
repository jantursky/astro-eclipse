import { noop, runTransition as run, type TransitionRequest as CoreRequest } from 'penumbra-core'

export { noop }

export type TransitionRequest = Omit<CoreRequest, 'isBusy'>

/**
 * Astro's ClientRouter sets this on <html> from the moment it starts its own view transition (after the new
 * page is fetched) until the page has swapped.
 */
const ASTRO_NAVIGATING = 'data-astro-transition'

/** Astro fires these around the fetch of the next page, before it sets the attribute above. */
const FETCH_TIMEOUT = 15_000
let fetchingSince = 0
let watching = false

export function watchNavigation(): void {
  if (watching) return
  watching = true
  document.addEventListener('astro:before-preparation', () => {
    fetchingSince = Date.now()
  })
  document.addEventListener('astro:after-preparation', () => {
    fetchingSince = 0
  })
}

const isNavigating = (): boolean =>
  document.documentElement.hasAttribute(ASTRO_NAVIGATING) ||
  (fetchingSince !== 0 && Date.now() - fetchingSince < FETCH_TIMEOUT)

/** Run `change` inside a View Transition unless Astro is navigating. See `penumbra-core`. */
export function runTransition(change: () => void, request: TransitionRequest): void {
  run(change, { ...request, isBusy: isNavigating })
}
