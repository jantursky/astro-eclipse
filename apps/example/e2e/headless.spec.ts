import { expect, test } from '@playwright/test'

import { collectErrors, storedTheme, themeAttribute } from './helpers'

test('a link with data-eclipse-set switches the theme and does not navigate', async ({ page }) => {
  const errors = collectErrors(page)
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/component')
  await page.getByRole('link', { name: 'dark', exact: true }).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  expect(await storedTheme(page)).toBe('dark')
  expect(new URL(page.url()).hash).toBe('')
  await page.getByRole('link', { name: 'sepia' }).click()
  await expect.poll(() => themeAttribute(page)).toBe('sepia')
  expect(errors).toEqual([])
})

test('the system value follows the OS scheme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.goto('/component')
  await page.getByRole('link', { name: 'the system theme' }).click()
  expect(await storedTheme(page)).toBe('system')
  await expect.poll(() => themeAttribute(page)).toBe('dark')
})

test('works on a non-link element and keeps working after a ClientRouter navigation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  await page
    .getByRole('link', { name: /component/i })
    .first()
    .click()
  await expect(page).toHaveURL(/component/)
  await page.getByRole('link', { name: 'dark', exact: true }).click()
  await expect.poll(() => themeAttribute(page)).toBe('dark')
  await page.getByTestId('headless-wipe').click()
  await expect.poll(() => themeAttribute(page)).toBe('light')
})

test('an unknown value logs an error and changes nothing', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/component')
  await page.evaluate(() => {
    const element = document.createElement('button')
    element.id = 'bad'
    element.dataset.eclipseSet = 'neon'
    document.body.append(element)
  })
  const messages: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text())
  })
  const before = await themeAttribute(page)
  await page.locator('#bad').click()
  await expect.poll(() => messages.length).toBe(1)
  expect(messages[0]).toContain('neon')
  expect(await themeAttribute(page)).toBe(before)
})
