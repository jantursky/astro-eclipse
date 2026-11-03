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
  ])('rejects %j', (options, message) => {
    // Invalid values are the point of this test, so they bypass the option types.
    expect(() => resolveConfig(options as EclipseOptions)).toThrow(message)
  })
})
