import { expect, test } from '@playwright/test'

import { TOGGLE, collectErrors, storedTheme, themeAttribute } from './helpers'

declare global {
  interface Window {
    __viewTransitions: number
    __lastChange?: { theme: string; preference: string }
  }
}

const countViewTransitions = (): void => {
  window.__viewTransitions = 0
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called back with the right `this` below
  const original = Document.prototype.startViewTransition
  if (typeof original !== 'function') return
  Document.prototype.startViewTransition = function (this: Document, ...args: never[]) {
    window.__viewTransitions++
    return (original as (...a: never[]) => ViewTransition).apply(this, args)
  } as typeof original
}

const trackChanges = (): void => {
  document.addEventListener('eclipse:change', (event) => {
    window.__lastChange = (event as CustomEvent<{ theme: string; preference: string }>).detail
  })
}

test('falls back to an instant switch without startViewTransition', async ({ page }) => {
  const errors = collectErrors(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => {
    delete (Document.prototype as Partial<Document>).startViewTransition
  })
  await page.goto('/')
  expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined')
  await page.locator(TOGGLE).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  expect(await storedTheme(page)).toBe('dark')
  expect(errors).toEqual([])
})

test('reduced motion switches instantly and never starts a view transition', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.addInitScript(countViewTransitions)
  await page.goto('/')
  await page.locator(TOGGLE).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  expect(await page.evaluate(() => window.__viewTransitions)).toBe(0)
})

test('the spy sees a view transition when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.addInitScript(countViewTransitions)
  await page.goto('/')
  const supported = await page.evaluate(() => typeof document.startViewTransition === 'function')
  test.skip(!supported, 'This browser build has no document.startViewTransition, so there is nothing to spy on.')
  await page.locator(TOGGLE).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  expect(await page.evaluate(() => window.__viewTransitions)).toBe(1)
})

for (const clicks of [2, 3]) {
  test(`${clicks} rapid toggles end in one consistent state`, async ({ page }) => {
    const errors = collectErrors(page)
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
    await page.addInitScript(trackChanges)
    await page.goto('/')
    const headStyles = await page.evaluate(() => document.head.querySelectorAll('style').length)

    await page.evaluate((count) => {
      const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!
      for (let i = 0; i < count; i++) button.click()
    }, clicks)
    await page.waitForTimeout(1000)

    const stored = await storedTheme(page)
    const attribute = await themeAttribute(page)
    const last = await page.evaluate(() => window.__lastChange)
    const shown = await page.locator('[data-theme-name]').first().textContent()
    // light -> dark -> sepia -> forest
    expect(stored).toBe(clicks === 2 ? 'sepia' : 'forest')
    expect(attribute).toBe(stored)
    expect(last).toEqual({ theme: stored, preference: stored })
    expect(shown).toBe(stored)
    expect(await page.evaluate(() => document.head.querySelectorAll('style').length)).toBe(headStyles)
    expect(await page.evaluate(() => document.head.innerHTML.includes('::view-transition'))).toBe(false)
    expect(errors).toEqual([])
  })
}

test('spaced clicks with real pointer input also end consistent', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/')
  const button = page.locator(TOGGLE)
  await button.click()
  await button.click()
  await button.click()
  await page.waitForTimeout(1000)
  expect(await storedTheme(page)).toBe('forest')
  expect(await themeAttribute(page)).toBe('forest')
  expect(await page.evaluate(() => document.head.innerHTML.includes('::view-transition'))).toBe(false)
})

test('toggling during a ClientRouter navigation does not break the navigation', async ({ page }) => {
  const errors = collectErrors(page)
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.route('**/navigation/b', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.continue()
  })
  await page.goto('/navigation/a')
  await page.evaluate(() => {
    ;(window as unknown as { __sameDocument: boolean }).__sameDocument = true
  })
  await page.locator('nav[aria-label="Navigation test pages"]').getByRole('link', { name: 'Page B' }).click()
  await page.locator(TOGGLE).click()
  await expect(page.getByTestId('page-id')).toHaveText('Page B')
  await page.waitForTimeout(800)

  expect(await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument)).toBe(true)
  expect(await page.evaluate(() => location.pathname)).toBe('/navigation/b')
  expect(await themeAttribute(page)).toBe('dark')
  expect(await storedTheme(page)).toBe('dark')
  await expect(page.getByTestId('theme')).toHaveText('dark')
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-astro-transition'))).toBe(false)

  await page.locator('nav[aria-label="Navigation test pages"]').getByRole('link', { name: 'Page C' }).click()
  await expect(page.getByTestId('page-id')).toHaveText('Page C')
  expect(await themeAttribute(page)).toBe('dark')
  expect(errors).toEqual([])
})

test('system mode follows the OS color scheme live', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  expect(await storedTheme(page)).toBeNull()
  await expect.poll(() => themeAttribute(page)).toBe('light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await expect(page.locator('[data-theme-name]').first()).toHaveText('dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect.poll(() => themeAttribute(page)).toBe('light')
  await expect(page.locator('[data-theme-pref]').first()).toHaveText('system')
})
