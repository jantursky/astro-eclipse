// Writes the inline head script for the default config, and for a config with every option on, to .size/,
// where size-limit measures them.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { resolveConfig } from '../dist/config.js'
import { buildHeadScript } from '../dist/head-script.js'

const dir = join(import.meta.dirname, '..', '.size')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'head-inline.js'), buildHeadScript(resolveConfig()))
writeFileSync(
  join(dir, 'head-inline-chrome.js'),
  buildHeadScript(
    resolveConfig({
      themes: ['light', 'dark', 'sepia', 'forest'],
      colorScheme: { light: 'light', dark: 'dark', sepia: 'light', forest: 'dark' },
      themeColor: { light: '#ffffff', dark: '#111111', sepia: '#f4ecd8', forest: '#10241a' },
    }),
  ),
)
