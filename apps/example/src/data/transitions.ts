export interface TransitionEntry {
  /** The name passed as `transition`. Must be registered by the library or by defineTransition(). */
  id: string
  label: string
  description: string
  /** True once the effect was checked in real browsers. */
  verified: boolean
}

/** The effects, in the order they were written. The gallery shows them alphabetically, see `transitions`. */
const entries: TransitionEntry[] = [
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
  {
    id: 'blur-circle',
    label: 'Blur circle',
    description: 'The new theme grows from the origin as a circle, sharpening as it opens.',
    verified: false,
  },
  {
    id: 'star',
    label: 'Star',
    description: 'The new theme grows from the origin as a five-pointed star.',
    verified: false,
  },
  {
    id: 'diagonal',
    label: 'Diagonal',
    description: 'A slanted edge sweeps across the screen in the chosen direction. Ignores the origin.',
    verified: false,
  },
  {
    id: 'diagonal-soft',
    label: 'Diagonal soft',
    description: 'A diagonal sweep with a soft, feathered edge. Ignores the origin.',
    verified: false,
  },
  {
    id: 'split',
    label: 'Split',
    description: 'The new theme opens from the middle outward. The direction sets the axis. Ignores the origin.',
    verified: false,
  },
  {
    id: 'scan',
    label: 'Scan',
    description:
      'Forty thin slats reveal the new theme like a scan line. The direction sets which way it travels. Ignores the origin.',
    verified: false,
  },
  {
    id: 'slide',
    label: 'Slide',
    description: 'The new theme pushes the old one off the screen in the chosen direction. Ignores the origin.',
    verified: false,
  },
  {
    id: 'zoom',
    label: 'Zoom',
    description: 'The old theme shrinks away while the new one settles in from slightly larger. Ignores the origin.',
    verified: false,
  },
  {
    id: 'square',
    label: 'Square',
    description: 'The new theme grows from the origin as a square.',
    verified: false,
  },
  {
    id: 'triangle',
    label: 'Triangle',
    description: 'The new theme grows from the origin as a triangle.',
    verified: false,
  },
  {
    id: 'sunburst',
    label: 'Sunburst',
    description: 'The new theme bursts from the origin as a twelve-point sun.',
    verified: false,
  },
  {
    id: 'cross',
    label: 'Cross',
    description: 'The new theme grows from the origin as a plus sign.',
    verified: false,
  },
  {
    id: 'heart',
    label: 'Heart',
    description: 'The new theme grows from the origin as a heart.',
    verified: false,
  },
  {
    id: 'ripple',
    label: 'Ripple',
    description: 'Rings spread from the origin and merge into the new theme.',
    verified: false,
  },
  {
    id: 'clock',
    label: 'Clock',
    description: "A radial sweep like a clock hand, one full turn from twelve o'clock, around the origin.",
    verified: false,
  },
  {
    id: 'curtain',
    label: 'Curtain',
    description:
      'Two shutters close in from opposite edges and meet in the middle. The direction sets the axis. Ignores the origin.',
    verified: false,
  },
  {
    id: 'stairs',
    label: 'Stairs',
    description: 'Ten columns (or rows) grow one after the other in the chosen direction. Ignores the origin.',
    verified: false,
  },
  {
    id: 'mosaic',
    label: 'Mosaic',
    description:
      'A grid of squares opens in a scattered order until the new theme fills the screen. Ignores the origin.',
    verified: false,
  },
  {
    id: 'blur',
    label: 'Blur',
    description: 'Both themes blur while they cross-fade. Ignores the origin.',
    verified: false,
  },
  {
    id: 'flip',
    label: 'Flip',
    description: 'The page turns like a card, in 3D, around the axis of the direction. Ignores the origin.',
    verified: false,
  },
  {
    id: 'spin',
    label: 'Spin',
    description: 'The new theme spins in from nothing, growing as it turns. Ignores the origin.',
    verified: false,
  },
  {
    id: 'cover',
    label: 'Cover',
    description: 'The new theme slides in over the old one, which stays put. Ignores the origin.',
    verified: false,
  },
  {
    id: 'reveal',
    label: 'Reveal',
    description: 'The old theme slides away and uncovers the new one. Ignores the origin.',
    verified: false,
  },
]

/** The single list the gallery is built from, A to Z by label. Add an entry above to show a new effect. */
export const transitions: TransitionEntry[] = [...entries].sort((a, b) => a.label.localeCompare(b.label))

/** The effect the demo starts on: the library's own default. */
export const defaultTransition = 'circle'

const usesOrigin = new Set([
  'circle',
  'circle-inverse',
  'diamond',
  'iris',
  'blur-circle',
  'star',
  'square',
  'triangle',
  'sunburst',
  'cross',
  'heart',
  'ripple',
  'clock',
])
const usesDirection = new Set([
  'wipe',
  'blinds',
  'diagonal',
  'diagonal-soft',
  'split',
  'scan',
  'slide',
  'curtain',
  'stairs',
  'flip',
  'cover',
  'reveal',
])

export interface ExampleSnippet {
  title: string
  code: string
}

/** Three ways to use one effect. Options an effect ignores are left out. */
export function examplesFor(id: string): ExampleSnippet[] {
  const origin = usesOrigin.has(id)
  const direction = usesDirection.has(id)
  const options = [
    `    transition: '${id}',`,
    '    duration: 600,',
    ...(origin ? ['    origin: event,'] : []),
    ...(direction ? [`    direction: 'down',`] : []),
  ]
  return [
    {
      title: 'Ready-made button',
      code: [
        '<ThemeToggle',
        `  themes={['light', 'dark']}`,
        `  transition="${id}"`,
        ...(direction ? [`  direction="down"`] : []),
        '/>',
      ].join('\n'),
    },
    {
      title: 'Your own script',
      code: [
        `import { setTheme } from 'astro-eclipse/client'`,
        '',
        `button.addEventListener('click', (event) => {`,
        `  setTheme('dark', {`,
        ...options,
        '  })',
        '})',
      ].join('\n'),
    },
    {
      title: 'Default for the whole site',
      code: ['// astro.config.mjs', 'eclipse({', `  themes: ['light', 'dark'],`, `  transition: '${id}',`, '})'].join(
        '\n',
      ),
    },
  ]
}

export const origins = [
  { id: 'click', label: 'Click point' },
  { id: 'center', label: 'Center' },
  { id: 'top-left', label: 'Top left' },
  { id: 'top-right', label: 'Top right' },
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom-right', label: 'Bottom right' },
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
