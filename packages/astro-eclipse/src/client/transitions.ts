import { coverRadius, type Point } from './origin.js'

export interface TransitionContext {
  /** Where the effect starts, in viewport pixels. */
  origin: Point
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
