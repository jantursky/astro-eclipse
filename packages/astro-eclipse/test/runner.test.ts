import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runTransition, type TransitionRequest } from '../src/client/runner.js'
import { defineTransition, getTransition } from '../src/client/transitions.js'
import { mockMedia, resetDom } from './helpers.js'

const request: TransitionRequest = { name: 'circle', duration: 400, easing: 'ease', origin: { x: 10, y: 20 } }

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
  const context = { origin: { x: 0, y: 0 }, width: 300, height: 400 }

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
