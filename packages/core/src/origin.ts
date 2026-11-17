export interface Point {
  x: number
  y: number
}

/** Where a reveal starts: a click event, an element, a point in viewport pixels, or the middle of the screen. */
export type Origin = MouseEvent | Element | Point | 'center'

function centerOf(element: Element): Point {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export function resolveOrigin(origin: Origin | undefined, viewport: { width: number; height: number }): Point {
  const middle = { x: viewport.width / 2, y: viewport.height / 2 }
  if (origin === undefined || origin === 'center') return middle
  if (origin instanceof Element) return centerOf(origin)
  if (origin instanceof MouseEvent) {
    // A click from the keyboard (Enter, Space) has no pointer position. Reveal from the button instead.
    const target = origin.currentTarget instanceof Element ? origin.currentTarget : origin.target
    if (origin.detail === 0 && origin.clientX === 0 && origin.clientY === 0 && target instanceof Element) {
      return centerOf(target)
    }
    return { x: origin.clientX, y: origin.clientY }
  }
  return origin
}

/** Distance from a point to the farthest corner of the viewport: the radius that covers the whole screen. */
export function coverRadius(point: Point, viewport: { width: number; height: number }): number {
  return Math.hypot(Math.max(point.x, viewport.width - point.x), Math.max(point.y, viewport.height - point.y))
}
