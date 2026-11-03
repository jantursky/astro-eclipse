import { expect, test } from '@playwright/test'

test.describe('home code blocks', () => {
  test('are highlighted, as wide as the column, and can be copied', async ({ page }) => {
    await page.addInitScript(() => {
      const copied: string[] = []
      ;(window as unknown as { __copied: string[] }).__copied = copied
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: (text: string) => Promise.resolve(void copied.push(text)) },
        configurable: true,
      })
    })
    await page.goto('/')
    const blocks = page.locator('.codeblock')
    expect(await blocks.count()).toBe(3)
    await expect(blocks.nth(1).locator('.tok-str').first()).toBeVisible()
    await expect(blocks.nth(1).locator('.tok-kw').first()).toBeVisible()
    // Full width: the block fills its parent and the copy button sits at the right edge.
    const block = await blocks.nth(1).boundingBox()
    const parent = await blocks.nth(1).locator('xpath=..').boundingBox()
    expect(Math.abs(block!.width - parent!.width)).toBeLessThan(2)
    const button = await blocks.nth(1).locator('[data-copy]').boundingBox()
    expect(block!.x + block!.width - (button!.x + button!.width)).toBeLessThan(16)
    await blocks.nth(1).locator('[data-copy]').click()
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)
    expect(copied[0]).toContain("import eclipse from 'astro-eclipse'")
  })
})
