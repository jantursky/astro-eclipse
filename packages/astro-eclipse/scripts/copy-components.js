// tsc does not know .astro files. Copy the components next to the compiled index.
import { cpSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
for (const name of ['ThemeToggle', 'ThemeSelect']) {
  cpSync(join(root, `src/components/${name}.astro`), join(root, `dist/components/${name}.astro`))
}
