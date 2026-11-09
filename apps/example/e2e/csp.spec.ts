import { createHash } from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { TOGGLE, storeTheme, themeAttribute } from './helpers'

/** Serve every page of the test with this Content-Security-Policy header, and collect violations. */
async function withPolicy(page: Page, policy: (inlineScripts: string[]) => string): Promise<string[]> {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    const response = await route.fetch()
    const body = await response.text()
    const inline = [...body.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
    await route.fulfill({
      response,
      body,
      headers: { ...response.headers(), 'content-security-policy': policy(inline) },
    })
  })
  const violations: string[] = []
  await page.exposeFunction('__reportViolation', (directive: string) => violations.push(directive))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      ;(window as unknown as { __reportViolation: (d: string) => void }).__reportViolation(event.violatedDirective)
    })
  })
  return violations
}

const hash = (script: string): string => `'sha256-${createHash('sha256').update(script).digest('base64')}'`

test('script-src with the hashes of the inline scripts runs the head script', async ({ page }) => {
  await storeTheme(page, 'dark')
  const violations = await withPolicy(page, (inline) => `script-src 'self' ${inline.map(hash).join(' ')}`)
  await page.goto('/')
  expect(await themeAttribute(page)).toBe('dark')
  expect(violations.filter((directive) => directive.startsWith('script-src'))).toEqual([])
})

test("script-src 'self' alone blocks the head script: no theme is applied before paint", async ({ page }) => {
  await storeTheme(page, 'dark')
  const violations = await withPolicy(page, () => "script-src 'self'")
  await page.goto('/')
  expect(violations.some((directive) => directive.startsWith('script-src'))).toBe(true)
  expect(await themeAttribute(page)).toBeNull()
})

test('a theme change under a strict style-src adds no inline style', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await storeTheme(page, 'light')
  const violations = await withPolicy(
    page,
    (inline) => `script-src 'self' ${inline.map(hash).join(' ')}; style-src 'self'`,
  )
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // Styles the page itself inlines are the site's to allow. What matters is what a theme change adds.
  violations.length = 0
  await page.locator(TOGGLE).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await page.waitForTimeout(800)
  expect(violations).toEqual([])
  expect(await page.evaluate(() => document.adoptedStyleSheets.length)).toBe(0)
})
