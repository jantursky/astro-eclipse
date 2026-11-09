import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { collectErrors, storeTheme, storedTheme, themeAttribute } from './helpers'

const DEFAULT = '[data-testid="select-default"]'
const LABELS = '[data-testid="select-labels"]'
const PLAIN = '[data-testid="select-plain"]'

test('lists the themes in order, then System', async ({ page }) => {
  await page.goto('/component')
  const values = await page
    .locator(`${DEFAULT} option`)
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value))
  expect(values).toEqual(['light', 'dark', 'sepia', 'forest', 'system'])
  const plain = await page
    .locator(`${PLAIN} option`)
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value))
  expect(plain).toEqual(['light', 'dark'])
})

test('custom labels and accessible name', async ({ page }) => {
  await page.goto('/component')
  await expect(page.locator(`${LABELS} option[value="dark"]`)).toHaveText('Dunkel')
  await expect(page.locator(`${LABELS} option[value="system"]`)).toHaveText('Automatisch')
  await expect(page.getByRole('combobox', { name: 'Farbschema' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Theme' }).first()).toBeVisible()
})

test('choosing an option applies and stores the theme', async ({ page }) => {
  const errors = collectErrors(page)
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/component')
  await page.locator(DEFAULT).selectOption('sepia')
  await expect.poll(() => themeAttribute(page)).toBe('sepia')
  expect(await storedTheme(page)).toBe('sepia')
  expect(errors).toEqual([])
})

test('System follows the OS color scheme and stays selected', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await storeTheme(page, 'light')
  await page.goto('/component')
  await expect(page.locator(DEFAULT)).toHaveValue('light')
  await page.locator(DEFAULT).selectOption('system')
  expect(await storedTheme(page)).toBe('system')
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await expect(page.locator(DEFAULT)).toHaveValue('system')
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await expect.poll(() => themeAttribute(page)).toBe('light')
  await expect(page.locator(DEFAULT)).toHaveValue('system')
})

test('selects stay in sync with each other', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/component')
  await page.locator(LABELS).selectOption('dark')
  await expect(page.locator(DEFAULT)).toHaveValue('dark')
  await expect(page.locator(PLAIN)).toHaveValue('dark')
})

test('shows the stored preference after a ClientRouter navigation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await storeTheme(page, 'forest')
  await page.goto('/')
  await page
    .getByRole('link', { name: /component/i })
    .first()
    .click()
  await expect(page).toHaveURL(/component/)
  await expect(page.locator(DEFAULT)).toHaveValue('forest')
})

test('works from the keyboard', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await storeTheme(page, 'light')
  await page.goto('/component')
  await page.locator(DEFAULT).focus()
  // Typing the first letter picks an option from the closed list on every platform. Arrow keys open the list
  // first on macOS, which headless browsers do not drive.
  await page.keyboard.press('d')
  await expect.poll(() => themeAttribute(page)).toBe('dark')
})

for (const theme of ['light', 'dark', 'sepia', 'forest']) {
  test(`no axe violations with the selects in the ${theme} theme`, async ({ page }) => {
    await storeTheme(page, theme)
    await page.goto('/component')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}
