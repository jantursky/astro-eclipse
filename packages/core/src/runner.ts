import { resolveOrigin, type Origin } from './origin.js'
import { getTransition, type Direction } from './transitions.js'

/**
 * A DOM change. It may return a promise, for frameworks that apply state on a later tick: the new snapshot is taken
 * once it settles.
 */
export type Change = () => void | Promise<void>

export interface TransitionRequest {
  name: string
  duration: number
  easing: string
  origin: Origin | undefined
  direction: Direction
  /** Suppress the page's own CSS transitions and animations for the frame of the change. */
  guardCss?: boolean
  /** Return true while the host framework runs a view transition of its own, such as a page navigation. The change is then applied without an effect. */
  isBusy?: () => boolean
}

export function noop(): void {
  // Nothing to do: used where a promise rejection or an unsubscribe has no work left.
}

let active: ViewTransition | undefined
// The effect animations of `active`. They are cancelled before the next transition starts: starting one while a
// pseudo-element animation is still running crashes headless Chromium (159), and a cancelled effect has nothing to show.
let effects: Animation[] = []

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Add CSS to the document for a moment and return the function that takes it out. A constructed stylesheet is not
 * an inline style, so a strict `style-src` (a CSP`style-src` sets one) does not block it. A browser that cannot
 * adopt stylesheets also has no View Transitions, so it needs only the CSS guard, which it then goes without.
 */
function addStyle(css: string): () => void {
  if (typeof CSSStyleSheet !== 'function' || !('adoptedStyleSheets' in document)) return noop
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
  return () => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((other) => other !== sheet)
  }
}

/**
 * Both snapshots are drawn on top of each other by default, with their own animations. Switch those
 * off for the duration of one transition, so the effect is the only thing that moves.
 */
function injectStyle(top: 'old' | 'new'): () => void {
  return addStyle(
    '::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}' +
      `::view-transition-${top}(root){z-index:2}`,
  )
}

/**
 * Elements with their own `transition` would animate at their own pace under the new theme. Switch those off while
 * `update` runs and until the frame after it has been drawn. The view-transition pseudo-elements are not matched
 * by `*`, so the reveal still plays.
 */
function guardCss(update: Change): Change {
  const remove = addStyle('*,*::before,*::after{transition:none!important;animation:none!important}')
  // Two frames, so style recalculation has settled before transitions come back.
  const release = (): void => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        remove()
      })
    })
  }
  return () => {
    let pending: void | Promise<void>
    try {
      pending = update()
    } catch (error) {
      release()
      throw error
    }
    if (pending === undefined) {
      release()
      return
    }
    return pending.finally(release)
  }
}

/**
 * Run `change` (a DOM change) inside a View Transition when the browser, the visitor and the
 * page allow it, and plainly otherwise. Never throws because an effect could not run.
 */
export function runTransition(change: Change, request: TransitionRequest): void {
  const update = request.guardCss === true ? guardCss(change) : change
  const definition = getTransition(request.name)
  const canAnimate =
    typeof document.startViewTransition === 'function' &&
    definition !== undefined &&
    request.duration > 0 &&
    !prefersReducedMotion() &&
    // A second view transition would cancel the host's page transition and leave the navigation half done.
    request.isBusy?.() !== true

  if (!canAnimate) {
    void update()
    return
  }

  // Skipping still runs the first update, so the page ends on the latest theme either way.
  for (const effect of effects) effect.cancel()
  effects = []
  active?.skipTransition()
  const removeStyle = injectStyle(definition.top ?? 'new')
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
        const effect = document.documentElement.animate(keyframes, {
          duration: request.duration,
          easing: request.easing,
          fill: 'both',
          pseudoElement: `::view-transition-${layer}(root)`,
        })
        effects.push(effect)
      }
    },
    () => {
      // Skipped or superseded before the animation started. The update has run or will run.
    },
  )
  transition.updateCallbackDone.catch(noop)
  void transition.finished.catch(noop).then(() => {
    removeStyle()
    if (active === transition) active = undefined
  })
}
