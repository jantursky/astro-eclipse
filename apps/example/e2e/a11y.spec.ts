import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { storeTheme } from './helpers'

for (const theme of ['light', 'dark']) {
  for (const path of ['/', '/gallery', '/navigation/a']) {
    test(`no axe violations on ${path} in the ${theme} theme`, async ({ page }) => {
      await storeTheme(page, theme)
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.waitForLoadState('networkidle')
      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
    })
  }
}
