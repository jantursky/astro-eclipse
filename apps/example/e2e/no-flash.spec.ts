import { expect, test } from '@playwright/test'

import { storeTheme } from './helpers'

interface FirstSet {
  value: string | null
  readyState: string
  hasBody: boolean
}

declare global {
  interface Window {
    __firstSet?: FirstSet
    __atContentLoaded?: string | null
  }
}

/** Notes the first time the attribute appears and whether the page had started to render by then. */
const watchFirstSet = (): void => {
  // <html> does not exist yet when init scripts run, so observe the document and filter on the attribute.
  const note = (): void => {
    const root = document.documentElement
    if (window.__firstSet || !(root as HTMLElement | null)?.hasAttribute('data-theme')) return
    window.__firstSet = {
      value: root.getAttribute('data-theme'),
      readyState: document.readyState,
      // `document.body` is null while the head is still parsing; the types do not know that.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      hasBody: document.body !== null,
    }
  }
  new MutationObserver(note).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('DOMContentLoaded', () => {
    window.__atContentLoaded = document.documentElement.getAttribute('data-theme')
  })
}

test.describe('no flash on first load', () => {
  test('stored dark theme is set before the body exists', async ({ page }) => {
    await storeTheme(page, 'dark')
    await page.addInitScript(watchFirstSet)
    await page.goto('/')
    const first = await page.evaluate(() => window.__firstSet)
    expect(first).toEqual({ value: 'dark', readyState: 'loading', hasBody: false })
    expect(await page.evaluate(() => window.__atContentLoaded)).toBe('dark')
  })

  test('system dark is resolved before the body exists', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(watchFirstSet)
    await page.goto('/gallery')
    const first = await page.evaluate(() => window.__firstSet)
    expect(first).toEqual({ value: 'dark', readyState: 'loading', hasBody: false })
    expect(await page.evaluate(() => window.__atContentLoaded)).toBe('dark')
  })

  test('system light is resolved before the body exists', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript(watchFirstSet)
    await page.goto('/')
    const first = await page.evaluate(() => window.__firstSet)
    expect(first).toEqual({ value: 'light', readyState: 'loading', hasBody: false })
  })
})
