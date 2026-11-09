import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { collectErrors, storeTheme, storedTheme, themeAttribute } from './helpers'

const DEFAULT = '[data-testid="radio-default"]'
const LABELS = '[data-testid="radio-labels"]'
const PLAIN = '[data-testid="radio-plain"]'
const SELECT = '[data-testid="select-default"]'

test('lists the themes in order, then System, as radios in a named group', async ({ page }) => {
  await page.goto('/component')
  const values = await page
    .locator(`${DEFAULT} input`)
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLInputElement).value))
  expect(values).toEqual(['light', 'dark', 'sepia', 'forest', 'system'])
  const plain = await page
    .locator(`${PLAIN} input`)
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLInputElement).value))
  expect(plain).toEqual(['light', 'dark'])
  await expect(page.getByRole('group', { name: 'Theme', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('group', { name: 'Farbschema' })).toBeVisible()
})

test('custom labels', async ({ page }) => {
  await page.goto('/component')
  await expect(page.locator(`${LABELS} label`).nth(1)).toHaveText('Dunkel')
  await expect(page.locator(`${LABELS} label`).nth(4)).toHaveText('Automatisch')
})

test('choosing a radio applies and stores the theme', async ({ page }) => {
  const errors = collectErrors(page)
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/component')
  await page.locator(DEFAULT).getByLabel('sepia').check()
  await expect.poll(() => themeAttribute(page)).toBe('sepia')
  expect(await storedTheme(page)).toBe('sepia')
  expect(errors).toEqual([])
})

test('System follows the OS color scheme and stays checked', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await storeTheme(page, 'light')
  await page.goto('/component')
  await expect(page.locator(DEFAULT).getByLabel('light')).toBeChecked()
  await page.locator(DEFAULT).getByLabel('System').check()
  expect(await storedTheme(page)).toBe('system')
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await expect(page.locator(DEFAULT).getByLabel('System')).toBeChecked()
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await expect.poll(() => themeAttribute(page)).toBe('light')
  await expect(page.locator(DEFAULT).getByLabel('System')).toBeChecked()
})

test('groups stay in sync with each other and with a select', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/component')
  await page.locator(LABELS).getByLabel('Dunkel').check()
  await expect(page.locator(DEFAULT).getByLabel('dark')).toBeChecked()
  await expect(page.locator(PLAIN).getByLabel('dark')).toBeChecked()
  await expect(page.locator(SELECT)).toHaveValue('dark')
  await page.locator(SELECT).selectOption('system')
  await expect(page.locator(DEFAULT).getByLabel('System')).toBeChecked()
  await expect(page.locator(LABELS).getByLabel('Automatisch')).toBeChecked()
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
  await expect(page.locator(DEFAULT).getByLabel('forest')).toBeChecked()
})

test('arrow keys move between the options and change the theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await storeTheme(page, 'light')
  await page.goto('/component')
  await page.locator(DEFAULT).getByLabel('light').focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await expect(page.locator(DEFAULT).getByLabel('dark')).toBeChecked()
})

for (const theme of ['light', 'dark', 'sepia', 'forest']) {
  test(`no axe violations with the radio groups in the ${theme} theme`, async ({ page }) => {
    await storeTheme(page, theme)
    await page.goto('/component')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}
