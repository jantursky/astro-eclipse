import { registerMoreTransitions } from './more-transitions.js'
import { coverRadius, type Point } from './origin.js'

/** The way an effect travels across the screen. */
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface TransitionContext {
  /** Where the effect starts, in viewport pixels. */
  origin: Point
  /** Which way a wipe or blinds effect travels. Default `'right'`. */
  direction: Direction
  width: number
  height: number
}

export interface TransitionDefinition {
  /** Keyframes for `::view-transition-old(root)`, the page as it was. */
  old?: (context: TransitionContext) => Keyframe[]
  /** Keyframes for `::view-transition-new(root)`, the page as it will be. */
  new?: (context: TransitionContext) => Keyframe[]
  /** Which snapshot is drawn above the other. Default `'new'`. */
  top?: 'old' | 'new'
}

const registry = new Map<string, TransitionDefinition>()

/**
 * Register an effect under `name`, then use it as `transition: name` in the config or in `setTheme()`.
 * Registering an existing name replaces it.
 */
export function defineTransition(name: string, definition: TransitionDefinition): TransitionDefinition {
  registry.set(name, definition)
  return definition
}

export function getTransition(name: string): TransitionDefinition | undefined {
  return registry.get(name)
}

const circleAt = (point: Point, radius: number): string => `circle(${radius}px at ${point.x}px ${point.y}px)`

defineTransition('circle', {
  new: ({ origin, width, height }) => [
    { clipPath: circleAt(origin, 0) },
    { clipPath: circleAt(origin, coverRadius(origin, { width, height })) },
  ],
})

defineTransition('circle-inverse', {
  top: 'old',
  old: ({ origin, width, height }) => [
    { clipPath: circleAt(origin, coverRadius(origin, { width, height })) },
    { clipPath: circleAt(origin, 0) },
  ],
})

defineTransition('fade', {
  old: () => [{ opacity: 1 }, { opacity: 0 }],
  new: () => [{ opacity: 0 }, { opacity: 1 }],
})

const BLIND_COUNT = 8
const SCAN_COUNT = 40

defineTransition('wipe', {
  new: ({ direction }) => {
    const hidden = {
      right: 'inset(0 100% 0 0)',
      left: 'inset(0 0 0 100%)',
      down: 'inset(0 0 100% 0)',
      up: 'inset(100% 0 0 0)',
    }
    return [{ clipPath: hidden[direction] }, { clipPath: 'inset(0 0 0 0)' }]
  },
})

const diamondAt = ({ x, y }: Point, r: number): string =>
  `polygon(${x}px ${y - r}px, ${x + r}px ${y}px, ${x}px ${y + r}px, ${x - r}px ${y}px)`

defineTransition('diamond', {
  new: ({ origin, width, height }) => [
    { clipPath: diamondAt(origin, 0) },
    // A diamond reaches a corner when the sum of the two distances equals its radius.
    { clipPath: diamondAt(origin, Math.max(origin.x, width - origin.x) + Math.max(origin.y, height - origin.y)) },
  ],
})

const hexagonAt = ({ x, y }: Point, r: number): string => {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index
    return `${x + r * Math.cos(angle)}px ${y + r * Math.sin(angle)}px`
  })
  return `polygon(${points.join(', ')})`
}

defineTransition('iris', {
  new: ({ origin, width, height }) => [
    { clipPath: hexagonAt(origin, 0) },
    // The apothem of a hexagon is cos(30deg) of its radius, so scale up to cover the farthest corner.
    { clipPath: hexagonAt(origin, coverRadius(origin, { width, height }) / Math.cos(Math.PI / 6)) },
  ],
})

/** Slats that each grow from the side the effect travels away from, drawn as one multi-part path. */
function blindsPath({ direction, width, height }: TransitionContext, progress: number, count: number): string {
  const vertical = direction === 'left' || direction === 'right'
  const length = vertical ? width : height
  const slat = length / count
  const grown = slat * progress
  const parts = Array.from({ length: count }, (_, index) => {
    const start = index * slat
    // Growing toward the start (`up`, `left`) means the slat's far edge stays put.
    const from = direction === 'up' || direction === 'left' ? start + slat - grown : start
    return vertical ? `M${from} 0h${grown}v${height}h${-grown}z` : `M0 ${from}h${width}v${grown}h${-width}z`
  })
  return `path('${parts.join('')}')`
}

defineTransition('blinds', {
  new: (context) => [
    { clipPath: blindsPath(context, 0, BLIND_COUNT) },
    { clipPath: blindsPath(context, 1, BLIND_COUNT) },
  ],
})

// Many thin slats read as a scan line moving across the page.
defineTransition('scan', {
  new: (context) => [
    { clipPath: blindsPath(context, 0, SCAN_COUNT) },
    { clipPath: blindsPath(context, 1, SCAN_COUNT) },
  ],
})

defineTransition('blur-circle', {
  new: ({ origin, width, height }) => [
    { clipPath: circleAt(origin, 0), filter: 'blur(24px)' },
    { clipPath: circleAt(origin, coverRadius(origin, { width, height })), filter: 'blur(0px)' },
  ],
})

/** Five-pointed star: outer and inner points alternate, the first one pointing up. */
const starAt = ({ x, y }: Point, r: number): string => {
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = (Math.PI / 5) * index - Math.PI / 2
    const radius = index % 2 === 0 ? r : r * 0.4
    return `${x + radius * Math.cos(angle)}px ${y + radius * Math.sin(angle)}px`
  })
  return `polygon(${points.join(', ')})`
}

defineTransition('star', {
  new: ({ origin, width, height }) => [
    { clipPath: starAt(origin, 0) },
    // The inner points sit at 0.4 of the radius, so the star must be larger than a circle to cover every corner.
    { clipPath: starAt(origin, (coverRadius(origin, { width, height }) / 0.4) * 1.1) },
  ],
})

/**
 * A slanted edge that sweeps across the screen. `progress` 0 keeps it fully off screen, 1 fully past the far
 * side, so the polygon can animate between the two.
 */
function diagonalPath({ direction, width, height }: TransitionContext, progress: number): string {
  const vertical = direction === 'up' || direction === 'down'
  const along = vertical ? height : width
  const across = vertical ? width : height
  const slant = across / 2
  const edge = -slant + progress * (along + slant)
  // Corners as [along, across] pairs: the covered side, then the slanted edge.
  const corners: [number, number][] = [
    [0, 0],
    [edge + slant, 0],
    [edge, across],
    [0, across],
  ]
  const mirrored = direction === 'left' || direction === 'up'
  const points = corners.map(([a, c]) => {
    const position = mirrored ? along - a : a
    return vertical ? `${c}px ${position}px` : `${position}px ${c}px`
  })
  return `polygon(${points.join(', ')})`
}

defineTransition('diagonal', {
  new: (context) => [{ clipPath: diagonalPath(context, 0) }, { clipPath: diagonalPath(context, 1) }],
})

const gradientAngle: Record<Direction, string> = {
  right: '105deg',
  left: '285deg',
  down: '195deg',
  up: '15deg',
}

/** A diagonal sweep with a soft edge: a mask that is opaque behind the edge and fades out ahead of it. */
defineTransition('diagonal-soft', {
  new: ({ direction }) => {
    const mask = `linear-gradient(${gradientAngle[direction]}, #000 40%, transparent 60%)`
    const frame = { maskImage: mask, WebkitMaskImage: mask, maskSize: '250% 250%', WebkitMaskSize: '250% 250%' }
    const start = { right: '100% 100%', left: '0% 0%', down: '100% 100%', up: '0% 0%' }[direction]
    return [
      { ...frame, maskPosition: start, WebkitMaskPosition: start },
      { ...frame, maskPosition: '50% 50%', WebkitMaskPosition: '50% 50%' },
    ]
  },
})

// Two halves of the new theme open from the middle, along the axis of `direction`.
defineTransition('split', {
  new: ({ direction }) => {
    const hidden = direction === 'left' || direction === 'right' ? 'inset(0 50% 0 50%)' : 'inset(50% 0 50% 0)'
    return [{ clipPath: hidden }, { clipPath: 'inset(0 0 0 0)' }]
  },
})

const offscreen = (direction: Direction, sign: 1 | -1): string => {
  const [axis, distance] = direction === 'left' || direction === 'right' ? (['X', 100] as const) : (['Y', 100] as const)
  return `translate${axis}(${(direction === 'right' || direction === 'down' ? -sign : sign) * distance}%)`
}

// The old theme is pushed off the screen by the new one, which slides in behind it.
defineTransition('slide', {
  old: ({ direction }) => [{ transform: 'translate(0, 0)' }, { transform: offscreen(direction, -1) }],
  new: ({ direction }) => [{ transform: offscreen(direction, 1) }, { transform: 'translate(0, 0)' }],
})

defineTransition('zoom', {
  old: () => [
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(0.92)' },
  ],
  new: () => [
    { opacity: 0, transform: 'scale(1.08)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
})

registerMoreTransitions(defineTransition)
