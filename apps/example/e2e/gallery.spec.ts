import { expect, test } from '@playwright/test'

import { collectErrors, storeTheme, themeAttribute } from './helpers'

test.describe('gallery', () => {
  test('every effect in All effects has a preview square that animates', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/gallery')
    const previews = page.locator('[data-preview]')
    expect(await previews.count()).toBeGreaterThan(10)
    // Each square runs one or two Web Animations on its layers.
    const animated = await previews.evaluateAll(
      (nodes) =>
        nodes.filter(
          (node) => node.querySelectorAll('.pv').length === 2 && node.getAnimations({ subtree: true }).length > 0,
        ).length,
    )
    expect(animated).toBe(await previews.count())
    expect(errors).toEqual([])
  })

  test('the Play buttons in All effects change the theme', async ({ page }) => {
    await storeTheme(page, 'light')
    await page.goto('/gallery')
    expect(await themeAttribute(page)).toBe('light')
    await page.locator('[data-play="slide"]').click()
    await expect.poll(() => themeAttribute(page)).toBe('dark')
    await expect(page.locator('#effect')).toHaveValue('slide')
    await page.locator('[data-play="star"]').click()
    await expect.poll(() => themeAttribute(page)).toBe('light')
    await expect(page.locator('#effect')).toHaveValue('star')
  })

  test('the effect select and All effects are sorted A to Z, and the select starts on circle', async ({ page }) => {
    await page.goto('/gallery')
    const labels = await page.locator('#effect option').allTextContents()
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
    await expect(page.locator('#effect')).toHaveValue('circle')
    const listed = await page
      .locator('.item h3')
      .evaluateAll((nodes) => nodes.map((node) => node.firstChild?.textContent?.trim() ?? ''))
    expect(listed).toEqual(labels)
  })

  test('Show code opens an animated panel with an example, and closes it again', async ({ page }) => {
    await page.goto('/gallery')
    const toggle = page.locator('[data-expand][aria-controls="code-heart"]')
    const panel = page.locator('#code-heart')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toBeHidden()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toContainText('Hide code')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText("transition: 'heart',")
    await expect(panel).toContainText('origin: event,')
    await expect(panel).toContainText('transition="heart"')
    await expect(panel.locator('.tok-str').first()).toBeVisible()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toBeHidden()
  })

  test('the example only lists the options an effect uses', async ({ page }) => {
    await page.goto('/gallery')
    await page.locator('[data-expand][aria-controls="code-slide"]').click()
    const text = await page.locator('#code-slide').textContent()
    expect(text).toContain(`direction: 'down'`)
    expect(text).not.toContain('origin: event')
  })

  test('the copy button puts the example on the clipboard and confirms it', async ({ page }) => {
    // A stub records the text, so the check works in every browser without clipboard permissions.
    await page.addInitScript(() => {
      const copied: string[] = []
      ;(window as unknown as { __copied: string[] }).__copied = copied
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: (text: string) => Promise.resolve(void copied.push(text)) },
        configurable: true,
      })
    })
    await page.goto('/gallery')
    await page.locator('[data-expand][aria-controls="code-star"]').click()
    const copy = page.locator('#code-star [data-copy]').nth(1)
    await expect(copy).toHaveAccessibleName('Copy code')
    await copy.click()
    await expect(copy).toHaveAttribute('data-copied', '')
    await expect(copy).toHaveAccessibleName('Copied')
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)
    expect(copied).toHaveLength(1)
    expect(copied[0]).toContain("import { setTheme } from 'astro-eclipse/client'")
    expect(copied[0]).toContain("transition: 'star',")
    await expect(copy).not.toHaveAttribute('data-copied', '', { timeout: 4000 })
  })

  test('each corner is its own origin, in the call and in the preview', async ({ page }) => {
    await page.goto('/gallery')
    const source = page.locator('[data-source]')
    const expected = {
      'Top left': '{ x: 0, y: 0 }',
      'Top right': '{ x: window.innerWidth, y: 0 }',
      'Bottom left': '{ x: 0, y: window.innerHeight }',
      'Bottom right': '{ x: window.innerWidth, y: window.innerHeight }',
    }
    for (const [label, literal] of Object.entries(expected)) {
      await page.getByLabel(label, { exact: true }).check()
      await expect(source).toContainText(`origin: ${literal},`)
    }
    // The preview circle starts in the chosen corner: its first keyframe is a point there.
    await page.getByLabel('Bottom right', { exact: true }).check()
    const stage = page.locator('[data-stage] .pv-new')
    const clip = await stage.evaluate((node) => {
      const effect = node.getAnimations()[0]?.effect as KeyframeEffect | undefined
      return effect?.getKeyframes()[0]?.clipPath as string | undefined
    })
    const box = await page.locator('[data-stage]').boundingBox()
    expect(clip).toContain(`at ${Math.round(box!.width)}px ${Math.round(box!.height)}px`)
  })

  test('The call has a copy button too', async ({ page }) => {
    await page.addInitScript(() => {
      const copied: string[] = []
      ;(window as unknown as { __copied: string[] }).__copied = copied
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: (text: string) => Promise.resolve(void copied.push(text)) },
        configurable: true,
      })
    })
    await page.goto('/gallery')
    await page.locator('.codeblock [data-copy]').click()
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)
    expect(copied[0]).toMatch(/^setTheme\('/)
    expect(copied[0]).toContain("transition: 'circle',")
  })
})
