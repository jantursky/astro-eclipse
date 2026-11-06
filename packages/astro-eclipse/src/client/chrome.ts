import type { EclipseConfig } from '../config.js'

/**
 * Keeps `color-scheme` on <html> and the `theme-color` meta tag in step with the applied theme. The inline
 * head script does the same for first paint and page swaps; the two must agree.
 */
export function applyChrome(doc: Document, theme: string, config: EclipseConfig): void {
  const { colorScheme, themeColor } = config
  if (colorScheme) {
    const root = doc.documentElement
    const scheme = colorScheme[theme]
    if (scheme) root.style.setProperty('color-scheme', scheme)
    else root.style.removeProperty('color-scheme')
  }
  const color = themeColor?.[theme]
  if (color) {
    let meta = doc.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
    if (!meta) {
      meta = doc.createElement('meta')
      meta.name = 'theme-color'
      doc.head.append(meta)
    }
    meta.content = color
  }
}
