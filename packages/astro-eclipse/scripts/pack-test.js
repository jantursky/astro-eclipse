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

export default defineConfig({ integrations: [eclipse({ themes: ['light', 'dark', 'sepia'], attribute: 'class', headless: true })] })
`,
  )
  write(
    'src/pages/index.astro',
    `---
import { ThemeRadio, ThemeSelect, ThemeToggle } from 'astro-eclipse/components'
---
<html lang="en">
  <head><meta charset="utf-8" /><title>pack test</title></head>
  <body>
    <button id="toggle">toggle</button>
    <ThemeToggle themes={['light', 'dark']} transition="wipe" />
    <ThemeSelect labels={{ dark: 'Night' }} />
    <ThemeRadio label="Colors" labels={{ dark: 'Dusk' }} />
    <ThemeRadio />
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
  if (!html.includes('data-eclipse-radio') || !html.includes('>Dusk<') || !html.includes('>Colors<')) {
    throw new Error('ThemeRadio was not rendered')
  }
  // Two groups on one page must not share a radio name, or checking one would uncheck the other.
  const radioNames = new Set(
    [...html.matchAll(/type="radio"[^>]*name="([^"]+)"|name="([^"]+)"[^>]*type="radio"/g)].map((m) => m[1] ?? m[2]),
  )
  if (radioNames.size !== 2) throw new Error(`Expected 2 radio group names, got ${[...radioNames].join(', ')}`)
  if (!html.includes('data-eclipse-select') || !html.includes('>Night<'))
    throw new Error('ThemeSelect was not rendered')
  if (!html.includes('eclipse-theme')) throw new Error('The inline head script is missing from the built page')
  // Astro inlines small scripts into the page, so look in the HTML and in the emitted assets.
  const assetDir = join(dir, 'dist/_astro')
  const assets = existsSync(assetDir) ? readdirSync(assetDir).filter((name) => name.endsWith('.js')) : []
  const bundled = [html, ...assets.map((name) => readFileSync(join(assetDir, name), 'utf8'))].join('\n')
  if (!bundled.includes('eclipse:change')) throw new Error('The client API is missing from the built site')
  // The package declares `sideEffects`, so a bundler drops any side-effect import it is not told about. The page
  // script that `headless` injects is such an import; it must survive into the build.
  if (!bundled.includes('[data-eclipse-set]')) throw new Error('The headless module is missing from the built site')
  console.log('built a fresh Astro site: head script inlined, client API and headless module bundled')

  // Invalid `themes` must fail the build with a message that names the problem.
  for (const [themes, message] of [
    ['[]', 'non-empty subset'],
    ["['light', 'neon']", 'Got: light, neon'],
    ["['light', 'system']", 'without "system"'],
  ]) {
    for (const component of ['ThemeSelect', 'ThemeRadio']) {
      write(
        'src/pages/bad.astro',
        `---
import { ${component} } from 'astro-eclipse/components'
---
<${component} themes={${themes}} />
`,
      )
      let output = ''
      try {
        run('npx', ['astro', 'build'], dir)
      } catch (error) {
        output = `${error.stdout ?? ''}${error.stderr ?? ''}`
      }
      if (!output.includes(`${component} \`themes\``) || !output.includes(message)) {
        throw new Error(`${component} with themes=${themes} did not fail the build with "${message}"`)
      }
    }
  }
  rmSync(join(dir, 'src/pages/bad.astro'))
  console.log('ThemeSelect and ThemeRadio reject invalid themes at build time')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
