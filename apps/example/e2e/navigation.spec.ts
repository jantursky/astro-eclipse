import { expect, test, type Page } from '@playwright/test'

import { TOGGLE, recordThemeAttribute, storedTheme, themeAttribute, themeLog } from './helpers'

const link = (page: Page, id: string) =>
  page.locator('nav[aria-label="Navigation test pages"]').getByRole('link', { name: `Page ${id}` })

test('the theme persists across ClientRouter navigation, back and forward', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await recordThemeAttribute(page)
  await page.goto('/navigation/a')
  await page.evaluate(() => {
    ;(window as unknown as { __sameDocument: boolean }).__sameDocument = true
  })

  await page.locator(TOGGLE).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await page.evaluate(() => {
    ;(window as unknown as { __themeLog: unknown[] }).__themeLog.length = 0
  })

  await link(page, 'B').click()
  await expect(page.getByTestId('page-id')).toHaveText('Page B')
  await link(page, 'C').click()
  await expect(page.getByTestId('page-id')).toHaveText('Page C')
  await page.goBack()
  await expect(page.getByTestId('page-id')).toHaveText('Page B')
  await page.goBack()
  await expect(page.getByTestId('page-id')).toHaveText('Page A')
  await page.goForward()
  await expect(page.getByTestId('page-id')).toHaveText('Page B')

  expect(await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument)).toBe(true)
  expect(await themeAttribute(page)).toBe('dark')
  expect(await storedTheme(page)).toBe('dark')
  await expect(page.getByTestId('theme')).toHaveText('dark')
  // Any wrong value, or a removed attribute (null), would have been a frame with the wrong theme.
  expect((await themeLog(page)).filter((value) => value !== 'dark')).toEqual([])
})
