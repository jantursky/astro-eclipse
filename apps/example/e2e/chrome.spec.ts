import { expect, test, type Page } from '@playwright/test'

import { TOGGLE, storeTheme, themeAttribute } from './helpers'

const EXPECTED: Record<string, { scheme: string; color: string }> = {
  light: { scheme: 'light', color: '#ffffff' },
  dark: { scheme: 'dark', color: '#111111' },
  sepia: { scheme: 'light', color: '#f4ecd8' },
  forest: { scheme: 'dark', color: '#10241a' },
}

const chrome = (page: Page) =>
  page.evaluate(() => ({
    scheme: document.documentElement.style.getPropertyValue('color-scheme'),
    colors: [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => meta.getAttribute('content')),
  }))

for (const [theme, { scheme, color }] of Object.entries(EXPECTED)) {
  test(`${theme}: color-scheme and theme-color are set on first load`, async ({ page }) => {
    await storeTheme(page, theme)
    await page.goto('/')
    expect(await chrome(page)).toEqual({ scheme, colors: [color] })
  })
}

test('they follow a theme change and survive ClientRouter navigation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await storeTheme(page, 'light')
  await page.goto('/navigation/a')
  await page.locator(TOGGLE).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  expect(await chrome(page)).toEqual({ scheme: 'dark', colors: ['#111111'] })

  await page.getByRole('navigation', { name: 'Navigation test pages' }).getByRole('link', { name: 'Page B' }).click()
  await expect(page.getByTestId('page-id')).toHaveText('Page B')
  expect(await chrome(page)).toEqual({ scheme: 'dark', colors: ['#111111'] })
})
