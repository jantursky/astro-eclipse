import type { Page } from '@playwright/test'

export const STORAGE_KEY = 'eclipse-theme'
export const TOGGLE = '[data-theme-toggle]'

export const themeAttribute = (page: Page): Promise<string | null> =>
  page.evaluate(() => document.documentElement.getAttribute('data-theme'))

export const storedTheme = (page: Page): Promise<string | null> =>
  page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

/** Store a theme before any page script runs, as a returning visitor would have. */
export async function storeTheme(page: Page, theme: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value)
    },
    [STORAGE_KEY, theme],
  )
}

/** Collects console errors and uncaught exceptions. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

/** Records every value of the theme attribute on <html>, including attribute removal (null). */
export async function recordThemeAttribute(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: (string | null)[] = []
    ;(window as unknown as { __themeLog: typeof log }).__themeLog = log
    new MutationObserver(() => {
      log.push(document.documentElement.getAttribute('data-theme'))
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] })
  })
}

export const themeLog = (page: Page): Promise<(string | null)[]> =>
  page.evaluate(() => (window as unknown as { __themeLog: (string | null)[] }).__themeLog)
