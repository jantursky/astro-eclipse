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
function blindsPath({ direction, width, height }: TransitionContext, progress: number): string {
  const vertical = direction === 'left' || direction === 'right'
  const length = vertical ? width : height
  const slat = length / BLIND_COUNT
  const grown = slat * progress
  const parts = Array.from({ length: BLIND_COUNT }, (_, index) => {
    const start = index * slat
    // Growing toward the start (`up`, `left`) means the slat's far edge stays put.
    const from = direction === 'up' || direction === 'left' ? start + slat - grown : start
    return vertical ? `M${from} 0h${grown}v${height}h${-grown}z` : `M0 ${from}h${width}v${grown}h${-width}z`
  })
  return `path('${parts.join('')}')`
}

defineTransition('blinds', {
  new: (context) => [{ clipPath: blindsPath(context, 0) }, { clipPath: blindsPath(context, 1) }],
})
