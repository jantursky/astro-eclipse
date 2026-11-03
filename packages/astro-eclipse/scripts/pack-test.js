// Installs the packed tarball into an empty project, the way a consumer gets it from npm,
// then builds a fresh Astro site with the integration. Run after `bun run build`.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const packageDir = resolve(import.meta.dirname, '..')
const dir = mkdtempSync(join(tmpdir(), 'astro-eclipse-pack-'))
const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' })
const write = (path, content) => {
  mkdirSync(join(dir, path, '..'), { recursive: true })
  writeFileSync(join(dir, path), content)
}

try {
  const [packed] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', dir], packageDir))
  const files = packed.files.map((file) => file.path).sort()
  const allowed = /^(dist\/.+\.(js|js\.map|d\.ts|astro)|README\.md|CHANGELOG\.md|LICENSE|package\.json)$/
  const unexpected = files.filter((file) => !allowed.test(file))
  if (unexpected.length > 0) throw new Error(`Unexpected files in the tarball: ${unexpected.join(', ')}`)
  console.log(`tarball: ${packed.filename}, ${files.length} files, ${(packed.size / 1024).toFixed(1)} kB`)

  write('package.json', JSON.stringify({ name: 'consumer', private: true, type: 'module' }))
  run(
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--loglevel=error',
      `./${packed.filename}`,
      `astro@${process.env.ASTRO_VERSION ?? 'latest'}`,
    ],
    dir,
  )

  write(
    'astro.config.mjs',
    `import { defineConfig } from 'astro/config'
import eclipse from 'astro-eclipse'

export default defineConfig({ integrations: [eclipse({ themes: ['light', 'dark', 'sepia'], attribute: 'class' })] })
`,
  )
  write(
    'src/pages/index.astro',
    `---
import { ThemeToggle } from 'astro-eclipse/components'
---
<html lang="en">
  <head><meta charset="utf-8" /><title>pack test</title></head>
  <body>
    <button id="toggle">toggle</button>
    <ThemeToggle themes={['light', 'dark']} transition="wipe" />
    <script>
      import { toggleTheme, getTheme } from 'astro-eclipse/client'
      document.getElementById('toggle')?.addEventListener('click', (event) => toggleTheme({ origin: event }))
      console.log(getTheme())
    </script>
  </body>
</html>
`,
  )
  run('npx', ['astro', 'build'], dir)

  const html = readFileSync(join(dir, 'dist/index.html'), 'utf8')
  if (!html.includes('data-eclipse-toggle')) throw new Error('ThemeToggle was not rendered')
  if (!html.includes('eclipse-theme')) throw new Error('The inline head script is missing from the built page')
  // Astro inlines small scripts into the page, so look in the HTML and in the emitted assets.
  const assetDir = join(dir, 'dist/_astro')
  const assets = existsSync(assetDir) ? readdirSync(assetDir).filter((name) => name.endsWith('.js')) : []
  const bundled = [html, ...assets.map((name) => readFileSync(join(assetDir, name), 'utf8'))].join('\n')
  if (!bundled.includes('eclipse:change')) throw new Error('The client API is missing from the built site')
  console.log('built a fresh Astro site: head script inlined, client API bundled')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
