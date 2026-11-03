// Writes the inline head script for the default config to .size/, where size-limit measures it.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { resolveConfig } from '../dist/config.js'
import { buildHeadScript } from '../dist/head-script.js'

const dir = join(import.meta.dirname, '..', '.size')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'head-inline.js'), buildHeadScript(resolveConfig()))
