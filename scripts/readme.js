// The root README is the source. The package README is the same text with absolute image URLs,
// because npm does not resolve relative paths. Run: bun run sync:readme
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const raw = 'https://raw.githubusercontent.com/jantursky/astro-eclipse/main/'
const source = readFileSync(join(root, 'README.md'), 'utf8')
const packaged = source
  .replaceAll('](.github/assets/', `](${raw}.github/assets/`)
  .replaceAll('](LICENSE)', '](https://github.com/jantursky/astro-eclipse/blob/main/LICENSE)')
  .replaceAll(
    '](packages/astro-eclipse/CHANGELOG.md)',
    '](https://github.com/jantursky/astro-eclipse/blob/main/packages/astro-eclipse/CHANGELOG.md)',
  )
const target = join(root, 'packages/astro-eclipse/README.md')
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== packaged)
    throw new Error('packages/astro-eclipse/README.md is out of date. Run bun run sync:readme')
} else {
  writeFileSync(target, packaged)
}
