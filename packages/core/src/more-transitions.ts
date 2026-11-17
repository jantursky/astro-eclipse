import { coverRadius, type Point } from './origin.js'
import type { Direction, TransitionContext, TransitionDefinition } from './transitions.js'

type Define = (name: string, definition: TransitionDefinition) => TransitionDefinition

const px = (point: Point): string => `${point.x}px ${point.y}px`
const polygon = (points: Point[]): string => `polygon(${points.map(px).join(', ')})`
const steps = (count: number): number[] => Array.from({ length: count + 1 }, (_, index) => index / count)
const clamp = (value: number): number => Math.min(1, Math.max(0, value))
const isHorizontal = (direction: Direction): boolean => direction === 'left' || direction === 'right'
const around = ({ x, y }: Point, count: number, radius: (index: number) => number, turn: number): Point[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + turn
    return { x: x + radius(index) * Math.cos(angle), y: y + radius(index) * Math.sin(angle) }
  })

/** `[from, to]` for a shape that is built from one radius, so a polygon with a fixed point count can animate. */
const growing =
  (shape: (origin: Point, radius: number) => string, reach: (cover: number) => number) =>
  ({ origin, width, height }: TransitionContext): Keyframe[] => [
    { clipPath: shape(origin, 0) },
    { clipPath: shape(origin, reach(coverRadius(origin, { width, height }))) },
  ]

/** Paths only interpolate between the same commands, so effects that move many points sample several frames. */
const sampled =
  (path: (context: TransitionContext, progress: number) => string, count: number) =>
  (context: TransitionContext): Keyframe[] =>
    steps(count).map((progress) => ({ clipPath: path(context, progress) }))

const square = ({ x, y }: Point, half: number): string =>
  polygon([
    { x: x - half, y: y - half },
    { x: x + half, y: y - half },
    { x: x + half, y: y + half },
    { x: x - half, y: y + half },
  ])

const triangle = (origin: Point, radius: number): string => polygon(around(origin, 3, () => radius, -Math.PI / 2))

const sunburst = (origin: Point, radius: number): string =>
  polygon(around(origin, 24, (index) => (index % 2 === 0 ? radius : radius * 0.6), -Math.PI / 2))

/** A plus: the arms are `0.35` of their length wide. */
const cross = ({ x, y }: Point, arm: number): string => {
  const w = arm * 0.35
  const points: [number, number][] = [
    [-w, -arm],
    [w, -arm],
    [w, -w],
    [arm, -w],
    [arm, w],
    [w, w],
    [w, arm],
    [-w, arm],
    [-w, w],
    [-arm, w],
    [-arm, -w],
    [-w, -w],
  ]
  return polygon(points.map(([dx, dy]) => ({ x: x + dx, y: y + dy })))
}

/** The classic heart curve, 40 samples, scaled so its half height is `size`. */
const heart = ({ x, y }: Point, size: number): string =>
  polygon(
    Array.from({ length: 40 }, (_, index) => {
      const t = (Math.PI * 2 * index) / 40
      const hx = 16 * Math.sin(t) ** 3
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
      return { x: x + (hx * size) / 17, y: y + (hy * size) / 17 }
    }),
  )

const circle = ({ x, y }: Point, r: number): string =>
  `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`

/** Rings that spread from the origin and close up into one disc, drawn with the even-odd rule. */
function ripplePath({ origin, width, height }: TransitionContext, progress: number): string {
  const outer = coverRadius(origin, { width, height }) * progress
  const band = outer * 0.15
  const gap = band * 0.9 * (1 - progress)
  const radii: number[] = [outer]
  // `radii` always holds `outer`, so `.at(-1)` is never undefined: the fallback only satisfies the types.
  /* v8 ignore next -- @preserve */
  for (const step of [band, gap, band, gap]) radii.push(Math.max(0, (radii.at(-1) ?? 0) - step))
  return `path(evenodd, '${radii.map((radius) => circle(origin, radius)).join('')}')`
}

const CLOCK_POINTS = 48

/** A radial sweep like a clock hand, starting at twelve o'clock and going clockwise. */
function clockPath({ origin, width, height }: TransitionContext, progress: number): string {
  const radius = (coverRadius(origin, { width, height }) * 1.05) / Math.cos(Math.PI / CLOCK_POINTS)
  const sweep = Math.PI * 2 * progress
  const rim = Array.from({ length: CLOCK_POINTS + 1 }, (_, index) => {
    const angle = -Math.PI / 2 + (sweep * index) / CLOCK_POINTS
    return { x: origin.x + radius * Math.cos(angle), y: origin.y + radius * Math.sin(angle) }
  })
  return polygon([origin, ...rim])
}

/** Two shutters that close in from opposite edges, along the axis of `direction`. */
function curtainPath({ direction, width, height }: TransitionContext, progress: number): string {
  if (isHorizontal(direction)) {
    const side = (width / 2) * progress
    return `path('M0 0h${side}v${height}h${-side}zM${width} 0h${-side}v${height}h${side}z')`
  }
  const side = (height / 2) * progress
  return `path('M0 0h${width}v${side}h${-width}zM0 ${height}h${width}v${-side}h${-width}z')`
}

/** Columns (or rows) that grow one after the other, in the order of `direction`. */
function stairsPath({ direction, width, height }: TransitionContext, progress: number): string {
  const count = 10
  const stagger = 0.6
  const horizontal = isHorizontal(direction)
  const reversed = direction === 'left' || direction === 'up'
  const slat = (horizontal ? width : height) / count
  const parts = Array.from({ length: count }, (_, index) => {
    const order = reversed ? count - 1 - index : index
    const grown = clamp(progress * (1 + stagger) - (order / (count - 1)) * stagger)
    const start = index * slat
    // A hair of overlap keeps anti-aliasing from showing seams between neighbours.
    return horizontal
      ? `M${start} 0h${slat + 1}v${height * grown}h${-(slat + 1)}z`
      : `M0 ${start}h${width * grown}v${slat + 1}h${-width * grown}z`
  })
  return `path('${parts.join('')}')`
}

/** A grid of squares that each open from their centre, in a fixed scattered order. */
function mosaicPath({ width, height }: TransitionContext, progress: number): string {
  const size = Math.ceil(width / 12)
  const columns = Math.ceil(width / size)
  const rows = Math.ceil(height / size)
  const parts: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const delay = ((((column * 73856093) ^ (row * 19349663)) >>> 0) % 1000) / 2000
      const half = size * 0.52 * clamp((progress - delay) / 0.5)
      const cx = column * size + size / 2
      const cy = row * size + size / 2
      parts.push(`M${cx - half} ${cy - half}h${2 * half}v${2 * half}h${-2 * half}z`)
    }
  }
  return `path('${parts.join('')}')`
}

const offscreen = (direction: Direction, sign: 1 | -1): string => {
  const axis = isHorizontal(direction) ? 'X' : 'Y'
  const behind = direction === 'right' || direction === 'down' ? -sign : sign
  return `translate${axis}(${behind * 100}%)`
}

const flipped = (direction: Direction, degrees: number): string =>
  `perspective(1400px) rotate${isHorizontal(direction) ? 'Y' : 'X'}(${degrees}deg)`

/** Registers the shape, sweep, grid and motion effects that sit beside the first set. */
export function registerMoreTransitions(define: Define): void {
  define('square', {
    new: ({ origin, width, height }) => [
      { clipPath: square(origin, 0) },
      {
        clipPath: square(origin, Math.max(origin.x, width - origin.x, origin.y, height - origin.y)),
      },
    ],
  })
  define('triangle', { new: growing(triangle, (cover) => cover * 2.1) })
  define('sunburst', { new: growing(sunburst, (cover) => (cover / 0.6) * 1.05) })
  define('cross', { new: growing(cross, (cover) => (cover / (0.35 * Math.SQRT2)) * 1.05) })
  // The notch at the top of the heart is its nearest edge, at 5 of its 17 units from the centre.
  define('heart', { new: growing(heart, (cover) => ((cover * 17) / 5) * 1.05) })
  define('ripple', { new: sampled(ripplePath, 12) })
  define('clock', { new: sampled(clockPath, 24) })
  define('curtain', { new: sampled(curtainPath, 1) })
  define('stairs', { new: sampled(stairsPath, 10) })
  define('mosaic', { new: sampled(mosaicPath, 10) })

  define('blur', {
    old: () => [
      { filter: 'blur(0px)', opacity: 1 },
      { filter: 'blur(18px)', opacity: 0 },
    ],
    new: () => [
      { filter: 'blur(18px)', opacity: 0 },
      { filter: 'blur(0px)', opacity: 1 },
    ],
  })

  // The page turns like a card: the old side goes edge-on at the halfway point, then the new side opens.
  define('flip', {
    old: ({ direction }) => [
      { transform: flipped(direction, 0), offset: 0 },
      { transform: flipped(direction, direction === 'right' || direction === 'down' ? 90 : -90), offset: 0.5 },
      { transform: flipped(direction, direction === 'right' || direction === 'down' ? 90 : -90), offset: 1 },
    ],
    new: ({ direction }) => [
      { transform: flipped(direction, direction === 'right' || direction === 'down' ? -90 : 90), offset: 0 },
      { transform: flipped(direction, direction === 'right' || direction === 'down' ? -90 : 90), offset: 0.5 },
      { transform: flipped(direction, 0), offset: 1 },
    ],
  })

  define('spin', {
    new: () => [
      { transform: 'rotate(-150deg) scale(0)', opacity: 0 },
      { transform: 'rotate(0deg) scale(1)', opacity: 1 },
    ],
  })

  // The new theme slides in over the old one, which stays put.
  define('cover', {
    new: ({ direction }) => [{ transform: offscreen(direction, 1) }, { transform: 'translate(0, 0)' }],
  })

  // The old theme slides away and uncovers the new one, which stays put.
  define('reveal', {
    top: 'old',
    old: ({ direction }) => [{ transform: 'translate(0, 0)' }, { transform: offscreen(direction, -1) }],
  })
}
