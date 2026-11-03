import { describe, expect, it } from 'vitest'

import { coverRadius, resolveOrigin } from '../src/client/origin.js'

const viewport = { width: 1000, height: 600 }

describe('resolveOrigin', () => {
  it('defaults to the middle of the screen', () => {
    expect(resolveOrigin(undefined, viewport)).toEqual({ x: 500, y: 300 })
    expect(resolveOrigin('center', viewport)).toEqual({ x: 500, y: 300 })
  })

  it('passes a point through', () => {
    expect(resolveOrigin({ x: 10, y: 20 }, viewport)).toEqual({ x: 10, y: 20 })
  })

  it('uses the pointer position of a click', () => {
    const click = new MouseEvent('click', { clientX: 120, clientY: 80, detail: 1 })
    expect(resolveOrigin(click, viewport)).toEqual({ x: 120, y: 80 })
  })

  it('uses the center of an element', () => {
    const element = document.createElement('button')
    element.getBoundingClientRect = () => ({ left: 100, top: 40, width: 40, height: 20 }) as DOMRect
    expect(resolveOrigin(element, viewport)).toEqual({ x: 120, y: 50 })
  })

  it('uses the button for a keyboard click, which has no pointer position', () => {
    const button = document.createElement('button')
    button.getBoundingClientRect = () => ({ left: 0, top: 0, width: 50, height: 50 }) as DOMRect
    const click = new MouseEvent('click', { clientX: 0, clientY: 0, detail: 0 })
    Object.defineProperty(click, 'currentTarget', { value: button })
    expect(resolveOrigin(click, viewport)).toEqual({ x: 25, y: 25 })
  })

  it('keeps 0,0 for a real click in the corner', () => {
    expect(resolveOrigin(new MouseEvent('click', { clientX: 0, clientY: 0, detail: 1 }), viewport)).toEqual({
      x: 0,
      y: 0,
    })
  })
})

describe('coverRadius', () => {
  it('reaches the farthest corner', () => {
    expect(coverRadius({ x: 0, y: 0 }, viewport)).toBeCloseTo(Math.hypot(1000, 600))
    expect(coverRadius({ x: 500, y: 300 }, viewport)).toBeCloseTo(Math.hypot(500, 300))
    expect(coverRadius({ x: 1000, y: 600 }, viewport)).toBeCloseTo(Math.hypot(1000, 600))
  })
})
