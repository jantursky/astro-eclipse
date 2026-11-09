// Writes the inline head script for the default config, and for a config with every option on, to .size/,
// where size-limit measures them. Also writes the headless module there, with its client import left external.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

// The headless module imports the client API, which is measured on its own. Point the import at the package name,
// so the budget covers only the module's own code (size-limit ignores that package).
writeFileSync(
  join(dir, 'headless.js'),
  readFileSync(join(import.meta.dirname, '..', 'dist/client/headless.js'), 'utf8').replace(
    /from\s*['"]\.\/index\.js['"]/,
    "from 'astro-eclipse/client'",
  ),
)
