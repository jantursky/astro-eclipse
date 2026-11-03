# Design

One system for the demo and the docs. Colors, type and spacing live in `tokens.css` as CSS custom properties; no surface uses an ad-hoc color.

## Palette

The system is dark-first: a pure black canvas, hairline borders, and a single pale yellow accent. Light mode is derived from it (same roles, inverted surfaces).

| Role              | Dark      | Light     |
| ----------------- | --------- | --------- |
| Canvas            | `#000000` | `#ffffff` |
| Card surface      | `#000000` | `#ffffff` |
| Raised surface    | `#0a0a0a` | `#f5f5f2` |
| Text              | `#ffffff` | `#000000` |
| Muted text        | `#999999` | `#5c5c5c` |
| Caption           | `#808080` | `#767676` |
| Border            | `#333333` | `#d9d9d4` |
| Accent (fill)     | `#ffffa7` | `#ffffa7` |
| Accent text/focus | `#fddd05` | `#8a7600` |
| On accent         | `#000000` | `#000000` |

The accent is the only chromatic UI color. A pale yellow fill always carries black text, in both modes. One filled accent button per viewport.

## Typography

- Family: Inter (`@fontsource-variable/inter`), weight 400 for text and 500 for navigation. Hierarchy comes from size and color, not weight.
- Scale: caption 12, body-sm 16, body 20, subheading 30, heading 32, heading-lg 50, display 120 (tracking -0.04em, line height 1).
- Body copy is never below 16 px, never centered.
- Code: system monospace at 14 px.

## Layout

- 4 px base unit; spacing 8, 12, 16, 20, 24, 32, 40, 64, 80, 128.
- Page max width 1200 px, section gap 80 px, element gap 10 px, card padding 20 px.
- Navigation about 56 px high, transparent, left-anchored.

## Shape and depth

- Radius 8 px on everything: buttons, cards, inputs, tags, previews. Never mix radii.
- No shadows, no gradients on UI surfaces. Cards are told apart by a 1 px border.
- No scale-on-hover. Hover on a ghost link fills it with the accent and black text.

## Components

- **Primary button:** accent fill, black text, padding 14 x 20, no border.
- **Ghost button:** transparent, 1 px text-colored border, padding 8 x 16.
- **Card:** canvas background, 1 px border, 20 px padding.
- **Status dot:** 6 px accent circle next to a 12 px uppercase label.
- **Preview frame:** 1 px border, 8 px radius, three 6 px caption-colored dots in the top bar.

## Do

- Keep sections on the plain canvas. At most one full-bleed accent section per page.
- Let the live effect be the picture: demo previews show the real transition, not illustrations.
- Keep focus rings visible: 2 px accent-text outline, 2 px offset.

## Don't

- Add a second chromatic accent.
- Put the accent fill on a light section background in dark mode, or use it as text on white.
- Use shadows, gradients or drop effects on UI.

## Logo

A crescent that wraps a smaller bowl: an eclipse, and the reveal edge of a theme change. Solid shape, no outline, no tile, readable at 16 px. The mark carries the Astro-style gradient from `#D83333` (top left) to `#F041FF` (bottom right). In dark mode both stops are lightened to `#F26A6A` and `#F777FF` so the mark keeps its contrast on black.

| Token                  | Light     | Dark      |
| ---------------------- | --------- | --------- |
| `--logo-gradient-from` | `#D83333` | `#F26A6A` |
| `--logo-gradient-to`   | `#F041FF` | `#F777FF` |

Files: `apps/docs/public/{logo,icon,icon-dark}.svg`, `apps/example/public/{favicon.svg,apple-touch-icon.png}`. The favicon switches colors with `prefers-color-scheme` inside the SVG. The UI accent stays the pale yellow; the gradient is for the mark only.
