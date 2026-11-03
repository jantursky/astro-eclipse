export interface TransitionEntry {
  /** The name passed as `transition`. Must be registered by the library or by defineTransition(). */
  id: string
  label: string
  description: string
  /** True once the effect was checked in real browsers. */
  verified: boolean
}

/** The single list the gallery is built from. Add an entry here to show a new effect. */
export const transitions: TransitionEntry[] = [
  {
    id: 'circle',
    label: 'Circle',
    description: 'The new theme grows from the origin as a circle until it covers the screen.',
    verified: false,
  },
  {
    id: 'circle-inverse',
    label: 'Circle inverse',
    description: 'The old theme shrinks into the origin and uncovers the new one.',
    verified: false,
  },
  {
    id: 'fade',
    label: 'Fade',
    description: 'A plain cross fade between the two themes. Ignores the origin.',
    verified: false,
  },
  {
    id: 'wipe',
    label: 'Wipe',
    description: 'A straight edge sweeps across the screen in the chosen direction. Ignores the origin.',
    verified: false,
  },
  {
    id: 'diamond',
    label: 'Diamond',
    description: 'The new theme grows from the origin as a diamond.',
    verified: false,
  },
  {
    id: 'iris',
    label: 'Iris',
    description: 'The new theme opens from the origin as a hexagon, like a camera iris.',
    verified: false,
  },
  {
    id: 'blinds',
    label: 'Blinds',
    description: 'Eight slats open one beside the other. The direction sets which way they grow. Ignores the origin.',
    verified: false,
  },
]

export const origins = [
  { id: 'click', label: 'Click point' },
  { id: 'center', label: 'Center' },
  { id: 'corner', label: 'Corner' },
] as const

export const directions = [
  { id: 'right', label: 'Right' },
  { id: 'left', label: 'Left' },
  { id: 'down', label: 'Down' },
  { id: 'up', label: 'Up' },
] as const

export type OriginId = (typeof origins)[number]['id']

export const themeCounts = [2, 3, 4] as const

/** Same order as `themes` in astro.config.mjs. The theme count control uses the first 2, 3 or 4. */
export const themeNames = ['light', 'dark', 'sepia', 'forest'] as const
