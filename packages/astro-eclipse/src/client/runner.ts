import { resolveOrigin, type Origin } from './origin.js'
import { getTransition, type Direction } from './transitions.js'

export interface TransitionRequest {
  name: string
  duration: number
  easing: string
  origin: Origin | undefined
  direction: Direction
  /** Suppress the page's own CSS transitions and animations for the frame of the change. */
  guardCss?: boolean
}

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

export function noop(): void {
  // Nothing to do: used where a promise rejection or an unsubscribe has no work left.
}

let active: ViewTransition | undefined

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Both snapshots are drawn on top of each other by default, with their own animations. Switch those
 * off for the duration of one transition, so the effect is the only thing that moves.
 */
function injectStyle(top: 'old' | 'new'): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent =
    '::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}' +
    `::view-transition-${top}(root){z-index:2}`
  document.head.append(style)
  return style
}

/**
 * Elements with their own `transition` would animate at their own pace under the new theme. Switch those off while
 * `update` runs and until the frame after it has been drawn. The view-transition pseudo-elements are not matched
 * by `*`, so the reveal still plays.
 */
function guardCss(update: () => void): () => void {
  const style = document.createElement('style')
  style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'
  document.head.append(style)
  return () => {
    try {
      update()
    } finally {
      // Two frames, so style recalculation has settled before transitions come back.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          style.remove()
        })
      })
    }
  }
}

/**
 * Run `update` (a synchronous DOM change) inside a View Transition when the browser, the visitor and the
 * page allow it, and plainly otherwise. Never throws because an effect could not run.
 */
export function runTransition(change: () => void, request: TransitionRequest): void {
  const update = request.guardCss === true ? guardCss(change) : change
  const definition = getTransition(request.name)
  const canAnimate =
    typeof document.startViewTransition === 'function' &&
    definition !== undefined &&
    request.duration > 0 &&
    !prefersReducedMotion() &&
    // A second view transition would cancel Astro's page transition and leave the navigation half done.
    !isNavigating()

  if (!canAnimate) {
    update()
    return
  }

  // Skipping still runs the first update, so the page ends on the latest theme either way.
  active?.skipTransition()
  const style = injectStyle(definition.top ?? 'new')
  const transition = document.startViewTransition(update)
  active = transition

  transition.ready.then(
    () => {
      const context = {
        origin: resolveOrigin(request.origin, { width: innerWidth, height: innerHeight }),
        direction: request.direction,
        width: innerWidth,
        height: innerHeight,
      }
      for (const layer of ['old', 'new'] as const) {
        const keyframes = definition[layer]?.(context)
        if (keyframes === undefined) continue
        document.documentElement.animate(keyframes, {
          duration: request.duration,
          easing: request.easing,
          fill: 'both',
          pseudoElement: `::view-transition-${layer}(root)`,
        })
      }
    },
    () => {
      // Skipped or superseded before the animation started. The update has run or will run.
    },
  )
  transition.updateCallbackDone.catch(noop)
  void transition.finished.catch(noop).then(() => {
    style.remove()
    if (active === transition) active = undefined
  })
}
