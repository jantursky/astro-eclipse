import { describe, expect, it } from 'vitest'

import { resolveConfig, type EclipseOptions } from '../src/config.js'

describe('resolveConfig', () => {
  it('fills in the defaults', () => {
    expect(resolveConfig()).toEqual({
      themes: ['light', 'dark'],
      default: 'system',
      attribute: 'data-theme',
      storageKey: 'eclipse-theme',
      transition: 'circle',
      duration: 500,
    })
  })

  it('accepts custom themes, a class attribute and a fixed default', () => {
    const config = resolveConfig({ themes: ['light', 'dark', 'sepia'], default: 'sepia', attribute: 'class' })
    expect(config.default).toBe('sepia')
    expect(config.attribute).toBe('class')
  })

  it('accepts a single theme', () => {
    expect(resolveConfig({ themes: ['brand'], default: 'brand' }).themes).toEqual(['brand'])
  })

  it.each([
    [{ themes: [] }, /at least one/],
    [{ themes: ['light', 'dark', 'light'] }, /duplicates/],
    [{ themes: ['light', 'dark', 'system'] }, /reserved/],
    [{ themes: ['light', 'da rk'] }, /invalid theme name/],
    [{ themes: ['light', '"></script>'] }, /invalid theme name/],
    [{ themes: ['sepia', 'ink'] }, /needs the themes "light" and "dark"/],
    [{ default: 'sepia' }, /not in `themes`/],
    [{ attribute: 'id' }, /"class" or "data-\*"/],
    [{ storageKey: '' }, /storageKey/],
    [{ duration: -1 }, /duration/],
    [{ duration: Number.NaN }, /duration/],
    [{ colorScheme: { sepia: 'light' } }, /colorScheme.*"sepia" is not in `themes`/],
    [{ colorScheme: { dark: 'darker' } }, /"light" or "dark"/],
    [{ themeColor: { sepia: '#fff' } }, /themeColor.*"sepia" is not in `themes`/],
    [{ themeColor: { dark: '' } }, /non-empty CSS color/],
    [{ themeColor: { dark: '<b>' } }, /without "<"/],
    [{ headless: 'yes' }, /`headless` must be true or false/],
    [{ headless: 1 }, /`headless` must be true or false/],
    [{ forcedTheme: 'yes' }, /`forcedTheme` must be true or false/],
    [{ disableCssTransitions: 1 }, /`disableCssTransitions` must be true or false/],
  ])('rejects %j', (options, message) => {
    // Invalid values are the point of this test, so they bypass the option types.
    expect(() => resolveConfig(options as EclipseOptions)).toThrow(message)
  })

  it('leaves headless out unless it is on', () => {
    expect(resolveConfig()).not.toHaveProperty('headless')
    expect(resolveConfig({ headless: false })).not.toHaveProperty('headless')
    expect(resolveConfig({ headless: true }).headless).toBe(true)
  })

  it('leaves forcedTheme and disableCssTransitions out unless they are on', () => {
    for (const option of ['forcedTheme', 'disableCssTransitions'] as const) {
      expect(resolveConfig()).not.toHaveProperty(option)
      expect(resolveConfig({ [option]: false })).not.toHaveProperty(option)
      expect(resolveConfig({ [option]: true })[option]).toBe(true)
    }
  })

  it('keeps colorScheme and themeColor when valid', () => {
    const config = resolveConfig({ colorScheme: { dark: 'dark' }, themeColor: { light: '#fff', dark: '#111' } })
    expect(config.colorScheme).toEqual({ dark: 'dark' })
    expect(config.themeColor).toEqual({ light: '#fff', dark: '#111' })
  })
})
