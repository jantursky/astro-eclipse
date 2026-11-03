import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { collectErrors, storeTheme, themeAttribute } from './helpers'

const BUTTON = '[data-eclipse-toggle]'

test('the accessible name states the current and the next theme', async ({ page }) => {
  await storeTheme(page, 'dark')
  await page.goto('/component')
  const button = page.locator(BUTTON).nth(1)
  await expect(button).toHaveAttribute('aria-label', 'Theme: dark. Switch to light')
  await expect(page.getByRole('button', { name: 'Theme: dark. Switch to light' }).first()).toBeVisible()
})

test('works from the keyboard and keeps every button in sync', async ({ page }) => {
  const errors = collectErrors(page)
  await storeTheme(page, 'light')
  await page.goto('/component')
  await page.locator(BUTTON).nth(1).focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await page.keyboard.press('Space')
  await expect.poll(() => themeAttribute(page)).toBe('light')
  // The first button cycles all four config themes, so it names a different next theme.
  await expect(page.locator(BUTTON).first()).toHaveAttribute('aria-label', 'Theme: light. Switch to dark')
  expect(errors).toEqual([])
})

test('cycles every theme of the config in order', async ({ page }) => {
  await storeTheme(page, 'light')
  await page.goto('/component')
  const seen: (string | null)[] = []
  let previous = await themeAttribute(page)
  for (let step = 0; step < 4; step += 1) {
    const before = previous
    await page.locator(BUTTON).first().click()
    await expect.poll(() => themeAttribute(page)).not.toBe(before)
    previous = await themeAttribute(page)
    seen.push(previous)
  }
  expect(seen).toEqual(['dark', 'sepia', 'forest', 'light'])
})

test('still works after a ClientRouter navigation and back', async ({ page }) => {
  await storeTheme(page, 'light')
  await page.goto('/component')
  await page.getByRole('link', { name: 'Go to a navigation page' }).click()
  await page.waitForURL('**/navigation/a')
  await page.goBack()
  await page.waitForURL('**/component')
  await page.locator(BUTTON).nth(1).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
})

for (const theme of ['light', 'dark']) {
  test(`has no axe violations in ${theme}`, async ({ page }) => {
    await storeTheme(page, theme)
    await page.goto('/component')
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations).toEqual([])
  })
}
