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

  describe('CSS transition guard', () => {
    let frames: (() => void)[]
    const flush = () => {
      frames.splice(0).forEach((frame) => {
        frame()
      })
    }
    const guards = () =>
      [...document.head.querySelectorAll('style')].filter((el) => el.textContent.includes('transition:none'))
    beforeEach(() => {
      frames = []
      vi.stubGlobal('requestAnimationFrame', (frame: () => void) => frames.push(frame))
    })

    it('is not injected by default', () => {
      delete (document as unknown as Record<string, unknown>).startViewTransition
      runTransition(() => {
        expect(guards()).toHaveLength(0)
      }, request)
    })

    it('is present while the instant update runs and removed two frames later', () => {
      delete (document as unknown as Record<string, unknown>).startViewTransition
      let during = 0
      runTransition(
        () => {
          during = guards().length
        },
        { ...request, guardCss: true },
      )
      expect(during).toBe(1)
      expect(guards()).toHaveLength(1)
      flush()
      expect(guards()).toHaveLength(1)
      flush()
      expect(guards()).toHaveLength(0)
    })

    it('wraps the update of an animated change and leaves the reveal style alone', async () => {
      let during = 0
      runTransition(
        () => {
          during = guards().length
        },
        { ...request, guardCss: true },
      )
      started[0]!.run()
      expect(during).toBe(1)
      // The reveal's own style does not mention transitions.
      expect(document.head.querySelectorAll('style')).toHaveLength(2)
      flush()
      flush()
      expect(guards()).toHaveLength(0)
      expect(document.head.querySelectorAll('style')).toHaveLength(1)
      started[0]!.finish()
      await started[0]!.finished
      await Promise.resolve()
      await Promise.resolve()
      expect(document.head.querySelectorAll('style')).toHaveLength(0)
    })

    it('removes the guard even when the update throws', () => {
      delete (document as unknown as Record<string, unknown>).startViewTransition
      expect(() => {
        runTransition(
          () => {
            throw new Error('boom')
          },
          { ...request, guardCss: true },
        )
      }).toThrow('boom')
      flush()
      flush()
      expect(guards()).toHaveLength(0)
    })
  })

  it('skips the running transition when a second one starts', () => {
    runTransition(() => {}, request)
    runTransition(() => {}, request)
    expect(started[0]!.skipTransition).toHaveBeenCalledOnce()
    expect(started[1]!.skipTransition).not.toHaveBeenCalled()
  })

  it('keeps the newer transition active when an older one finishes late', async () => {
    runTransition(() => {}, request)
    runTransition(() => {}, request)
    started[0]!.finish()
    await started[0]!.finished
    await Promise.resolve()
    await Promise.resolve()
    // The first one finishing must not forget the second: a third call still skips the second.
    runTransition(() => {}, request)
    expect(started[1]!.skipTransition).toHaveBeenCalledOnce()
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

describe('extra effects', () => {
  const context = { origin: { x: 100, y: 50 }, direction: 'right' as Direction, width: 300, height: 200 }
  const frames = (name: string, layer: 'old' | 'new' = 'new', ctx = context) =>
    getTransition(name)![layer]!(ctx) as [Keyframe, Keyframe]

  it('scan draws many more slats than blinds, with the same number before and after', () => {
    const [from, to] = frames('scan').map((frame) => frame.clipPath as string) as [string, string]
    expect(from.match(/M/g)).toHaveLength(40)
    expect(to.match(/M/g)).toHaveLength(40)
  })

  it('blur-circle grows a circle while the blur clears', () => {
    expect(frames('blur-circle')).toEqual([
      { clipPath: 'circle(0px at 100px 50px)', filter: 'blur(24px)' },
      { clipPath: `circle(${Math.hypot(200, 150)}px at 100px 50px)`, filter: 'blur(0px)' },
    ])
  })

  it('star starts as a point and its inner radius still covers the farthest corner', () => {
    const [from, to] = frames('star').map((frame) => frame.clipPath as string) as [string, string]
    expect(from).toMatch(/^polygon\((100px 50px(, )?){10}\)$/)
    expect(to.match(/px/g)).toHaveLength(20)
    const top = Number(/^polygon\([^ ]+ (-?[\d.]+)px/.exec(to)![1])
    expect(top).toBeCloseTo(50 - (Math.hypot(200, 150) / 0.4) * 1.1, 5)
  })

  it.each([
    [
      'right',
      'polygon(0px 0px, 0px 0px, -100px 200px, 0px 200px)',
      'polygon(0px 0px, 400px 0px, 300px 200px, 0px 200px)',
    ],
    [
      'left',
      'polygon(300px 0px, 300px 0px, 400px 200px, 300px 200px)',
      'polygon(300px 0px, -100px 0px, 0px 200px, 300px 200px)',
    ],
    [
      'down',
      'polygon(0px 0px, 0px 0px, 300px -150px, 300px 0px)',
      'polygon(0px 0px, 0px 350px, 300px 200px, 300px 0px)',
    ],
  ] as const)('diagonal travelling %s', (direction, start, end) => {
    expect(frames('diagonal', 'new', { ...context, direction }).map((frame) => frame.clipPath)).toEqual([start, end])
  })

  it('diagonal-soft keeps the same mask in both frames and moves only its position', () => {
    const [from, to] = frames('diagonal-soft')
    expect(from.maskImage).toBe(to.maskImage)
    expect(from.maskImage).toContain('linear-gradient(105deg')
    expect(from.maskPosition).not.toBe(to.maskPosition)
  })

  it('split opens from the middle along the travel axis', () => {
    expect(frames('split').map((frame) => frame.clipPath)).toEqual(['inset(0 50% 0 50%)', 'inset(0 0 0 0)'])
    expect(frames('split', 'new', { ...context, direction: 'up' })[0].clipPath).toBe('inset(50% 0 50% 0)')
  })

  it.each([
    ['right', 'translateX(-100%)', 'translateX(100%)'],
    ['left', 'translateX(100%)', 'translateX(-100%)'],
    ['down', 'translateY(-100%)', 'translateY(100%)'],
    ['up', 'translateY(100%)', 'translateY(-100%)'],
  ] as const)('slide travelling %s pushes the old theme out', (direction, enters, leaves) => {
    const ctx = { ...context, direction }
    expect(frames('slide', 'new', ctx)[0].transform).toBe(enters)
    expect(frames('slide', 'old', ctx)[1].transform).toBe(leaves)
  })

  it('zoom fades and scales both snapshots', () => {
    expect(frames('zoom', 'old')[1]).toEqual({ opacity: 0, transform: 'scale(0.92)' })
    expect(frames('zoom')[0]).toEqual({ opacity: 0, transform: 'scale(1.08)' })
  })
})

describe('shape effects cover the whole viewport at the end', () => {
  const size = { width: 300, height: 200 }
  const direction = 'right' as Direction
  const polygonPoints = (value: string): [number, number][] =>
    [...value.matchAll(/(-?[\d.e+-]+)px (-?[\d.e+-]+)px/g)].map((match) => [Number(match[1]), Number(match[2])])
  const inside = (point: [number, number], polygon: [number, number][]): boolean => {
    let hit = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]!
      const [xj, yj] = polygon[j]!
      if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  // One pixel inside the edge: a shape that reaches a corner exactly sits on its boundary.
  const probes: [number, number][] = [
    [1, 1],
    [299, 1],
    [1, 199],
    [299, 199],
    [150, 1],
    [150, 199],
    [1, 100],
    [299, 100],
  ]

  describe.each(['square', 'triangle', 'sunburst', 'cross', 'heart', 'star', 'iris', 'diamond', 'clock'])(
    '%s',
    (name) => {
      it.each([
        ['the centre', { x: 150, y: 100 }],
        ['the top left corner', { x: 0, y: 0 }],
        ['the bottom right corner', { x: 300, y: 200 }],
        ['an off-centre click', { x: 40, y: 170 }],
      ] as const)('from %s', (_, origin) => {
        const frames = getTransition(name)!.new!({ origin, direction, ...size })
        const last = frames.at(-1)!.clipPath as string
        const polygon = polygonPoints(last)
        for (const probe of probes) expect(inside(probe, polygon), `${probe.join(',')} in ${name}`).toBe(true)
      })
    },
  )

  it('every polygon effect keeps the same number of points in all of its frames', () => {
    for (const name of ['square', 'triangle', 'sunburst', 'cross', 'heart', 'clock']) {
      const frames = getTransition(name)!.new!({ origin: { x: 10, y: 10 }, direction, ...size })
      const counts = new Set(frames.map((frame) => polygonPoints(frame.clipPath as string).length))
      expect(counts.size, name).toBe(1)
    }
  })
})

describe('path effects', () => {
  const context = { origin: { x: 100, y: 50 }, direction: 'right' as Direction, width: 300, height: 200 }
  const paths = (name: string, ctx = context) => getTransition(name)!.new!(ctx).map((frame) => frame.clipPath as string)
  const heights = (path: string): number[] =>
    [...path.matchAll(/M[\d.-]+ 0h[\d.]+v([\d.]+)h/g)].map((m) => Number(m[1]))

  it('ripple draws the same five circles in every frame, with the even-odd rule', () => {
    const frames = paths('ripple')
    expect(frames).toHaveLength(13)
    for (const frame of frames) {
      expect(frame.startsWith("path(evenodd, 'M")).toBe(true)
      expect(frame.match(/M/g)).toHaveLength(5)
    }
  })

  it('ripple closes its gaps at the end, so the final frame is one disc', () => {
    const last = paths('ripple').at(-1)!
    const radii = [...last.matchAll(/a([\d.]+) [\d.]+ 0 1 0 [\d.-]+ 0a/g)].map((m) => Number(m[1]))
    expect(radii[1]).toBeCloseTo(radii[2]!, 6)
    expect(radii[3]).toBeCloseTo(radii[4]!, 6)
  })

  it('clock sweeps one full turn from a single point', () => {
    const frames = paths('clock', { ...context, origin: { x: 150, y: 100 } })
    expect(frames).toHaveLength(25)
    const start = frames[0]!.match(/-?[\d.]+px -?[\d.]+px/g)!
    expect(new Set(start.slice(1)).size).toBe(1)
  })

  it('curtain closes in from both sides along the axis of travel', () => {
    expect(paths('curtain')).toEqual([
      "path('M0 0h0v200h0zM300 0h0v200h0z')",
      "path('M0 0h150v200h-150zM300 0h-150v200h150z')",
    ])
    expect(paths('curtain', { ...context, direction: 'down' })[1]).toBe(
      "path('M0 0h300v100h-300zM0 200h300v-100h-300z')",
    )
  })

  it('stairs start every column at zero and end with every column full', () => {
    const frames = paths('stairs')
    expect(frames).toHaveLength(11)
    expect(frames[0]!.match(/M/g)).toHaveLength(10)
    expect(new Set(heights(frames[0]!))).toEqual(new Set([0]))
    expect(new Set(heights(frames.at(-1)!))).toEqual(new Set([200]))
  })

  it.each([
    ['right', true],
    ['left', false],
  ] as const)('stairs travelling %s start with the %s edge', (direction, leftFirst) => {
    const [first, last] = [heights(paths('stairs', { ...context, direction })[4]!)].flatMap((list) => [
      list[0]!,
      list.at(-1)!,
    ])
    expect(first! > last!).toBe(leftFirst)
  })

  it.each([
    ['down', true],
    ['up', false],
  ] as const)('stairs travelling %s grow the rows from the %s edge', (direction, topFirst) => {
    const frame = paths('stairs', { ...context, direction })[4]!
    const widths = [...frame.matchAll(/M0 [\d.-]+h([\d.]+)v/g)].map((m) => Number(m[1]))
    expect(widths).toHaveLength(10)
    expect(widths[0]! > widths.at(-1)!).toBe(topFirst)
  })

  it('mosaic samples one square per cell in every frame and opens each one fully', () => {
    const frames = paths('mosaic')
    expect(frames).toHaveLength(11)
    for (const frame of frames) expect(frame.match(/M/g)).toHaveLength(12 * 8)
    expect(frames.at(-1)).toContain('h26v26h-26z')
  })
})

describe('motion effects', () => {
  const context = { origin: { x: 100, y: 50 }, direction: 'right' as Direction, width: 300, height: 200 }
  const define = (name: string) => getTransition(name)!

  it('blur fades and unblurs both snapshots', () => {
    expect(define('blur').old!(context)[1]).toEqual({ filter: 'blur(18px)', opacity: 0 })
    expect(define('blur').new!(context)[0]).toEqual({ filter: 'blur(18px)', opacity: 0 })
  })

  it.each([
    ['right', 'rotateY', 90, -90],
    ['left', 'rotateY', -90, 90],
    ['down', 'rotateX', 90, -90],
    ['up', 'rotateX', -90, 90],
  ] as const)('flip travelling %s turns the old side away on %s', (direction, axis, away, toward) => {
    const ctx = { ...context, direction }
    const old = define('flip').old!(ctx)
    const next = define('flip').new!(ctx)
    expect(old[1]).toEqual({ transform: `perspective(1400px) ${axis}(${away}deg)`, offset: 0.5 })
    expect(next[0]).toEqual({ transform: `perspective(1400px) ${axis}(${toward}deg)`, offset: 0 })
    // Neither side is visible past the half way point, so the two never overlap.
    expect(old[2]!.transform).toBe(old[1]!.transform)
    expect(next[1]!.transform).toBe(next[0]!.transform)
  })

  it('spin turns and grows the new theme from nothing', () => {
    expect(define('spin').new!(context)).toEqual([
      { transform: 'rotate(-150deg) scale(0)', opacity: 0 },
      { transform: 'rotate(0deg) scale(1)', opacity: 1 },
    ])
  })

  it.each([
    ['left', 'translateX(100%)', 'translateX(-100%)'],
    ['down', 'translateY(-100%)', 'translateY(100%)'],
    ['up', 'translateY(100%)', 'translateY(-100%)'],
  ] as const)('cover and reveal travelling %s slide along the right axis', (direction, coverFrom, revealTo) => {
    const ctx = { ...context, direction }
    expect(define('cover').new!(ctx)[0]).toEqual({ transform: coverFrom })
    expect(define('reveal').old!(ctx)[1]).toEqual({ transform: revealTo })
  })

  it('cover moves only the new theme and reveal moves only the old one', () => {
    expect(define('cover').old).toBeUndefined()
    expect(define('cover').new!(context)[0]).toEqual({ transform: 'translateX(-100%)' })
    expect(define('reveal').new).toBeUndefined()
    expect(define('reveal').top).toBe('old')
    expect(define('reveal').old!(context)[1]).toEqual({ transform: 'translateX(100%)' })
  })
})
