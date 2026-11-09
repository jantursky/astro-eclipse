import { expect, test } from '@playwright/test'

import { TOGGLE, recordThemeAttribute, storedTheme, storeTheme, themeAttribute, themeLog } from './helpers'

const TOGGLE_LIB = '[data-eclipse-toggle]'

test('paints the forced theme with no frame of another, and leaves storage alone', async ({ page }) => {
  await storeTheme(page, 'light')
  await recordThemeAttribute(page)
  await page.goto('/forced')
  expect(await themeAttribute(page)).toBe('dark')
  expect(await storedTheme(page)).toBe('light')
  expect((await themeLog(page)).filter((value) => value !== 'dark')).toEqual([])
})

test('ClientRouter restores the stored choice when leaving the forced page, and forces it again on return', async ({
  page,
}) => {
  await storeTheme(page, 'light')
  await page.goto('/forced')
  await page.evaluate(() => {
    ;(window as unknown as { __sameDocument: boolean }).__sameDocument = true
  })
  expect(await themeAttribute(page)).toBe('dark')

  await page.getByRole('link', { name: 'the navigation test' }).click()
  await expect(page.getByTestId('page-id')).toHaveText('Page A')
  expect(await themeAttribute(page)).toBe('light')

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'This page is always dark' })).toBeVisible()
  expect(await themeAttribute(page)).toBe('dark')
  expect(await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument)).toBe(true)
  expect(await storedTheme(page)).toBe('light')
})

test('the built-in controls are disabled and change nothing', async ({ page }) => {
  await storeTheme(page, 'light')
  await page.goto('/forced')
  const toggle = page.getByTestId('forced-toggle')
  await expect(toggle).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByTestId('forced-select')).toBeDisabled()
  await expect(page.getByTestId('forced-radio').getByRole('radio').first()).toBeDisabled()
  await toggle.click({ force: true })
  expect(await themeAttribute(page)).toBe('dark')
  expect(await storedTheme(page)).toBe('light')
})

test('controls are enabled again on an unforced page', async ({ page }) => {
  await page.goto('/forced')
  await page.getByRole('link', { name: 'Go to an unforced page' }).click()
  await expect(page.locator(TOGGLE_LIB).first()).not.toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('select[data-eclipse-select]').first()).toBeEnabled()
})

test('an element with a slow CSS transition changes with the page, not over seconds', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await storeTheme(page, 'light')
  await page.goto('/component')
  // Not the forced page, so the click really changes the theme. Add the same slow box here.
  await page.evaluate(() => {
    const box = document.createElement('p')
    box.dataset.testid = 'slow-box'
    box.style.cssText = 'transition:background-color 3s linear;background-color:var(--text);padding:8px'
    box.textContent = 'slow'
    document.body.append(box)
  })
  const color = () => page.getByTestId('slow-box').evaluate((el) => getComputedStyle(el).backgroundColor)
  const before = await color()
  await page
    .locator(TOGGLE)
    .click()
    .catch(() => page.locator(TOGGLE_LIB).first().click())
  await expect.poll(() => themeAttribute(page)).not.toBe('light')
  // Well inside the 3 s transition: with the guard the color is already the new theme's final value.
  await page.waitForTimeout(400)
  const after = await color()
  expect(after).not.toBe(before)
  await page.waitForTimeout(400)
  expect(await color()).toBe(after)
})
