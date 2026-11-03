// tsc does not know .astro files. Copy the components next to the compiled index.
import { cpSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
cpSync(join(root, 'src/components/ThemeToggle.astro'), join(root, 'dist/components/ThemeToggle.astro'))
