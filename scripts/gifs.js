// Records one GIF per transition from the demo, for the README. Run: bun run gifs
// Needs ffmpeg on the PATH and Playwright's Chromium. Builds and serves the demo itself.
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const out = join(root, '.github/assets/transitions')
const port = 4181
const size = { width: 720, height: 420 }
const duration = 900
const effects = [
  { id: 'circle' },
  { id: 'circle-inverse' },
  { id: 'wipe', direction: 'right' },
  { id: 'diamond' },
  { id: 'iris' },
  { id: 'blinds', direction: 'right' },
  { id: 'blur-circle' },
  { id: 'star' },
  { id: 'diagonal', direction: 'right' },
  { id: 'diagonal-soft', direction: 'right' },
  { id: 'split', direction: 'right' },
  { id: 'scan', direction: 'right' },
  { id: 'slide', direction: 'right' },
  { id: 'zoom' },
  { id: 'fade' },
]

execFileSync('bun', ['run', 'build'], { cwd: root, stdio: 'inherit' })
const server = spawn('bunx', ['astro', 'preview', '--port', String(port), '--ignore-lock'], {
  cwd: join(root, 'apps/example'),
  stdio: 'ignore',
})
await new Promise((resolveWait) => setTimeout(resolveWait, 4000))

mkdirSync(out, { recursive: true })
const videos = mkdtempSync(join(tmpdir(), 'eclipse-gifs-'))
const browser = await chromium.launch()
try {
  for (const effect of effects) {
    const dir = join(videos, effect.id)
    const startedAt = Date.now()
    const context = await browser.newContext({ viewport: size, recordVideo: { dir, size } })
    await context.addInitScript(() => localStorage.setItem('eclipse-theme', 'light'))
    const page = await context.newPage()
    await page.goto(`http://localhost:${port}/component`)
    // The second button on this page is the two-theme toggle, so every click flips light and dark.
    const button = page.locator('[data-eclipse-toggle]').nth(1)
    await button.evaluate(
      (element, options) => {
        element.dataset.transition = options.id
        element.dataset.duration = String(options.duration)
        if (options.direction) element.dataset.direction = options.direction
        else delete element.dataset.direction
      },
      { ...effect, duration },
    )
    await page.waitForTimeout(600)
    const firstClick = Date.now() - startedAt
    await button.click()
    await page.waitForTimeout(duration + 900)
    await button.click()
    await page.waitForTimeout(duration + 500)
    await context.close()

    const [video] = readdirSync(dir)
    const start = Math.max(0, firstClick / 1000 - 0.4).toFixed(2)
    const seconds = ((duration * 2 + 2300) / 1000).toFixed(2)
    const palette = join(dir, 'palette.png')
    const input = ['-ss', start, '-t', seconds, '-i', join(dir, video)]
    const filters = 'fps=15,scale=640:-1:flags=lanczos'
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      ...input,
      '-vf',
      `${filters},palettegen=max_colors=64`,
      palette,
    ])
    const target = join(out, `${effect.id}.gif`)
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      ...input,
      '-i',
      palette,
      '-lavfi',
      `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
      target,
    ])
    console.log(`${effect.id}.gif ${(statSync(target).size / 1024).toFixed(0)} kB`)
  }
} finally {
  await browser.close()
  server.kill()
  rmSync(videos, { recursive: true, force: true })
}
