import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runTransition, watchNavigation, type TransitionRequest } from '../src/client/runner.js'
import { defineTransition, getTransition, type Direction } from '../src/client/transitions.js'
import { mockMedia, resetDom } from './helpers.js'

const request: TransitionRequest = {
  name: 'circle',
  duration: 400,
  easing: 'ease',
  origin: { x: 10, y: 20 },
  direction: 'right',
}

/** A controllable stand-in for a ViewTransition. */
function fakeTransition(update: () => void, skipped = false) {
  let finish!: () => void
  let ready!: () => void
  const transition = {
    ready: skipped
      ? Promise.reject(new DOMException('skipped', 'AbortError'))
      : new Promise<void>((resolve) => (ready = resolve)),
    finished: new Promise<void>((resolve) => (finish = resolve)),
    updateCallbackDone: Promise.resolve(),
    skipTransition: vi.fn(),
    run: () => {
      update()
      ready()
    },
    finish,
  }
  return transition
}

describe('runTransition', () => {
  let media: ReturnType<typeof mockMedia>
  let started: ReturnType<typeof fakeTransition>[]
  let skipNext: boolean
  let animate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetDom()
    watchNavigation()
    document.dispatchEvent(new Event('astro:after-preparation'))
    media = mockMedia()
    started = []
    skipNext = false
    animate = vi.fn()
    document.documentElement.animate = animate as unknown as typeof document.documentElement.animate
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 600)
    ;(document as unknown as Record<string, unknown>).startViewTransition = (update: () => void) => {
      const transition = fakeTransition(update, skipNext)
      started.push(transition)
      return transition
    }
  })
  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).startViewTransition
    vi.unstubAllGlobals()
  })

  it('switches instantly without the View Transitions API', () => {
    delete (document as unknown as Record<string, unknown>).startViewTransition
    const update = vi.fn()
    runTransition(update, request)
    expect(update).toHaveBeenCalledOnce()
  })

  it.each([
    [
      'reduced motion',
      () => {
        media.setReduce(true)
      },
      request,
    ],
    ['a zero duration', () => {}, { ...request, duration: 0 }],
    ['an unknown effect', () => {}, { ...request, name: 'nope' }],
    [
      'an Astro navigation in progress',
      () => {
        document.documentElement.setAttribute('data-astro-transition', 'forward')
      },
      request,
    ],
  ])('switches instantly for %s', (_name, arrange, req) => {
    arrange()
    const update = vi.fn()
    runTransition(update, req)
    expect(update).toHaveBeenCalledOnce()
    expect(started).toHaveLength(0)
  })

  it('switches instantly while Astro fetches the next page, before it sets its own attribute', () => {
    document.dispatchEvent(new Event('astro:before-preparation'))
    const update = vi.fn()
    runTransition(update, request)
    expect(update).toHaveBeenCalledOnce()
    expect(started).toHaveLength(0)

    document.dispatchEvent(new Event('astro:after-preparation'))
    runTransition(() => {}, request)
    expect(started).toHaveLength(1)
  })

  it('stops waiting for a navigation that never reports back', () => {
    vi.useFakeTimers()
    document.dispatchEvent(new Event('astro:before-preparation'))
    vi.advanceTimersByTime(16_000)
    runTransition(() => {}, request)
    expect(started).toHaveLength(1)
    vi.useRealTimers()
  })

  it('animates the new snapshot with the circle effect, covering the screen', async () => {
    const update = vi.fn()
    runTransition(update, request)
    expect(started).toHaveLength(1)
    started[0]!.run()
    await started[0]!.ready
    await Promise.resolve()
    expect(update).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledOnce()
    const [keyframes, options] = animate.mock.calls[0] as [Keyframe[], KeyframeAnimationOptions]
    expect(keyframes[0]).toEqual({ clipPath: 'circle(0px at 10px 20px)' })
    expect(keyframes[1]!.clipPath).toMatch(/^circle\(1\d{3}(\.\d+)?px at 10px 20px\)$/)
    expect(options).toMatchObject({ duration: 400, easing: 'ease', pseudoElement: '::view-transition-new(root)' })
  })

  it('puts the old snapshot on top for circle-inverse', async () => {
    runTransition(() => {}, { ...request, name: 'circle-inverse' })
    expect(document.head.querySelector('style')?.textContent).toContain('::view-transition-old(root){z-index:2}')
    started[0]!.run()
    await started[0]!.ready
    await Promise.resolve()
    expect(animate.mock.calls[0]![1]).toMatchObject({ pseudoElement: '::view-transition-old(root)' })
  })

  it('removes its style element when the transition finishes', async () => {
    runTransition(() => {}, request)
    expect(document.head.querySelectorAll('style')).toHaveLength(1)
    started[0]!.finish()
    await started[0]!.finished
    await Promise.resolve()
    await Promise.resolve()
    expect(document.head.querySelectorAll('style')).toHaveLength(0)
  })

  it('skips the running transition when a second one starts', () => {
    runTransition(() => {}, request)
    runTransition(() => {}, request)
    expect(started[0]!.skipTransition).toHaveBeenCalledOnce()
    expect(started[1]!.skipTransition).not.toHaveBeenCalled()
  })

  it('ignores a transition that is skipped before it is ready', async () => {
    skipNext = true
    runTransition(() => {}, request)
    await started[0]!.ready.catch(() => {})
    await Promise.resolve()
    expect(animate).not.toHaveBeenCalled()
  })
})

describe('defineTransition', () => {
  it('registers a custom effect that replaces a built-in of the same name', () => {
    const custom = defineTransition('custom', { new: () => [{ opacity: 0 }, { opacity: 1 }] })
    expect(getTransition('custom')).toBe(custom)
    const replacement = defineTransition('custom', { top: 'old' })
    expect(getTransition('custom')).toBe(replacement)
  })
})

describe('built-in effects', () => {
  const context = { origin: { x: 0, y: 0 }, direction: 'right' as Direction, width: 300, height: 400 }

  it('circle grows the new snapshot from the origin', () => {
    const keyframes = getTransition('circle')!.new!(context)
    expect(keyframes.map((frame) => frame.clipPath)).toEqual(['circle(0px at 0px 0px)', 'circle(500px at 0px 0px)'])
  })

  it('circle-inverse shrinks the old snapshot into the origin', () => {
    const keyframes = getTransition('circle-inverse')!.old!(context)
    expect(keyframes[0]!.clipPath).toBe('circle(500px at 0px 0px)')
    expect(keyframes[1]!.clipPath).toBe('circle(0px at 0px 0px)')
  })

  it('fade cross-fades the two snapshots', () => {
    const fade = getTransition('fade')!
    expect(fade.old!(context)[1]).toEqual({ opacity: 0 })
    expect(fade.new!(context)[0]).toEqual({ opacity: 0 })
  })
})

describe('shape and sweep effects', () => {
  const context = { origin: { x: 100, y: 50 }, direction: 'right' as Direction, width: 300, height: 200 }
  const clip = (name: string, ctx = context) => getTransition(name)!.new!(ctx).map((frame) => frame.clipPath)

  it.each([
    ['right', ['inset(0 100% 0 0)', 'inset(0 0 0 0)']],
    ['left', ['inset(0 0 0 100%)', 'inset(0 0 0 0)']],
    ['down', ['inset(0 0 100% 0)', 'inset(0 0 0 0)']],
    ['up', ['inset(100% 0 0 0)', 'inset(0 0 0 0)']],
  ] as const)('wipe travelling %s', (direction, expected) => {
    expect(clip('wipe', { ...context, direction })).toEqual(expected)
  })

  it('diamond starts as a point and reaches the farthest corner', () => {
    expect(clip('diamond')).toEqual([
      'polygon(100px 50px, 100px 50px, 100px 50px, 100px 50px)',
      'polygon(100px -300px, 450px 50px, 100px 400px, -250px 50px)',
    ])
  })

  it('iris grows a hexagon that covers the viewport', () => {
    const [from, to] = clip('iris') as [string, string]
    expect(from).toMatch(/^polygon\((100px 50px(, )?){6}\)$/)
    const radius = Math.hypot(200, 150) / Math.cos(Math.PI / 6)
    expect(to.startsWith(`polygon(${100 + radius}px 50px`)).toBe(true)
  })

  it('blinds draw the same number of slats before and after, so the path can animate', () => {
    const [from, to] = clip('blinds', { ...context, direction: 'down' }) as [string, string]
    expect(from.match(/M/g)).toHaveLength(8)
    expect(to.match(/M/g)).toHaveLength(8)
    expect(to.startsWith("path('M0 0h300v25h-300z")).toBe(true)
    expect(from.startsWith("path('M0 0h300v0h-300z")).toBe(true)
  })

  it.each([
    ['up', "path('M0 25h300v0h-300z"],
    ['left', "path('M37.5 0h0v200h0z"],
    ['right', "path('M0 0h0v200h0z"],
  ] as const)('blinds travelling %s start from the right edge of each slat', (direction, start) => {
    expect((clip('blinds', { ...context, direction }) as [string, string])[0].startsWith(start)).toBe(true)
  })
})
