import { expect, test } from '@playwright/test'

import { collectErrors, recordThemeAttribute, storeTheme, storedTheme, themeAttribute, themeLog } from './helpers'

// Pages /mpa/a and /mpa/b are plain pages. /mpa/c and /mpa/d opt in to cross-document view transitions.
// None of them uses ClientRouter, so every link is a full page load and only the head script keeps the theme.
const PAIRS = [
  ['a', 'b', 'plain links'],
  ['c', 'd', 'cross-document view transitions'],
] as const

for (const [from, to, label] of PAIRS) {
  test.describe(label, () => {
    test(`the stored theme is on the next page before it paints (${from} to ${to})`, async ({ page }) => {
      const errors = collectErrors(page)
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
      await storeTheme(page, 'forest')
      await recordThemeAttribute(page)
      await page.goto(`/mpa/${from}`)
      await expect(page.getByTestId('page-id')).toHaveText(`Page ${from}`)
      await page.getByTestId('other').click()
      await expect(page.getByTestId('page-id')).toHaveText(`Page ${to}`)
      // The log belongs to the new document: its first value is already the stored theme, so nothing flashed.
      const log = await themeLog(page)
      expect(log[0]).toBe('forest')
      expect(new Set(log)).toEqual(new Set(['forest']))
      expect(await themeAttribute(page)).toBe('forest')
      expect(errors).toEqual([])
    })

    test(`a theme picked on one page is on the next (${from} to ${to})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
      await page.goto(`/mpa/${from}`)
      await expect.poll(() => themeAttribute(page)).toBe('light')
      await page.getByTestId('plain-toggle').click()
      await expect.poll(() => themeAttribute(page)).toBe('dark')
      expect(await storedTheme(page)).toBe('dark')
      await page.getByTestId('other').click()
      await expect(page.getByTestId('page-id')).toHaveText(`Page ${to}`)
      expect(await themeAttribute(page)).toBe('dark')
    })
  })
}

test('cross-document pages paint the stored theme with motion allowed', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Cross-document view transitions run in Chromium only.')
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await storeTheme(page, 'sepia')
  await recordThemeAttribute(page)
  await page.goto('/mpa/c')
  await page.getByTestId('other').click()
  await expect(page.getByTestId('page-id')).toHaveText('Page d')
  const log = await themeLog(page)
  expect(new Set(log)).toEqual(new Set(['sepia']))
})
