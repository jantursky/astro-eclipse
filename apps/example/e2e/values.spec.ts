import { expect, test } from '@playwright/test'

import { storeTheme, storedTheme, themeAttribute, themeLog, recordThemeAttribute } from './helpers'

// The demo config maps `forest` to the DOM value `theme-forest`; every other theme uses its own name.
test('the DOM shows the mapped value while storage and the API keep the theme name', async ({ page }) => {
  await storeTheme(page, 'forest')
  await recordThemeAttribute(page)
  await page.goto('/component')
  expect(await themeAttribute(page)).toBe('theme-forest')
  expect(await storedTheme(page)).toBe('forest')
  expect((await themeLog(page)).filter((value) => value !== 'theme-forest')).toEqual([])
  await expect(page.getByTestId('default')).toHaveAttribute('aria-label', /Theme: forest\./)
})

test('the mapped value survives a ClientRouter navigation', async ({ page }) => {
  await storeTheme(page, 'forest')
  await page.goto('/component')
  await page.getByRole('link', { name: 'Go to a navigation page' }).click()
  await expect(page.getByTestId('page-id')).toHaveText('Page A')
  expect(await themeAttribute(page)).toBe('theme-forest')
})
