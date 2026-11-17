import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runTransition, watchNavigation, type TransitionRequest } from '../src/client/runner.js'
import { mockMedia, resetDom } from './helpers.js'

const request: TransitionRequest = {
  name: 'circle',
  duration: 400,
  easing: 'ease',
  origin: { x: 10, y: 20 },
  direction: 'right',
}

/** The effects themselves are tested in `@penumbra/core`; here only Astro's navigation guard. */
describe('runTransition under Astro', () => {
  let started: number

  beforeEach(() => {
    resetDom()
    watchNavigation()
    document.dispatchEvent(new Event('astro:after-preparation'))
    mockMedia()
    started = 0
    ;(document as unknown as Record<string, unknown>).startViewTransition = (update: () => void) => {
      started++
      update()
      return {
        ready: new Promise<void>(() => {}),
        finished: new Promise<void>(() => {}),
        updateCallbackDone: Promise.resolve(),
        skipTransition: vi.fn(),
      }
    }
  })
  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).startViewTransition
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('animates when no navigation is running', () => {
    runTransition(() => {}, request)
    expect(started).toBe(1)
  })

  it('switches instantly while ClientRouter runs its own transition', () => {
    document.documentElement.setAttribute('data-astro-transition', 'forward')
    const update = vi.fn()
    runTransition(update, request)
    expect(update).toHaveBeenCalledOnce()
    expect(started).toBe(0)
  })

  it('switches instantly while Astro fetches the next page, before it sets its own attribute', () => {
    document.dispatchEvent(new Event('astro:before-preparation'))
    const update = vi.fn()
    runTransition(update, request)
    expect(update).toHaveBeenCalledOnce()
    expect(started).toBe(0)

    document.dispatchEvent(new Event('astro:after-preparation'))
    runTransition(() => {}, request)
    expect(started).toBe(1)
  })

  it('stops waiting for a navigation that never reports back', () => {
    vi.useFakeTimers()
    document.dispatchEvent(new Event('astro:before-preparation'))
    vi.advanceTimersByTime(16_000)
    runTransition(() => {}, request)
    expect(started).toBe(1)
  })
})
