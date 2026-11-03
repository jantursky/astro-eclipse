import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEclipse, type ThemeChange } from '../src/client/core.js'
import { config, mockMedia, resetDom } from './helpers.js'

import type { EclipseOptions } from '../src/config.js'

const theme = () => document.documentElement.dataset.theme

function setup(options?: EclipseOptions) {
  return createEclipse(config({ duration: 0, ...options }))
}

describe('createEclipse', () => {
  let media: ReturnType<typeof mockMedia>
  beforeEach(() => {
    resetDom()
    media = mockMedia()
  })

  describe('reading', () => {
    it('resolves "system" to the OS theme', () => {
      media.setDark(true)
      const eclipse = setup()
      expect(eclipse.getPreference()).toBe('system')
      expect(eclipse.getTheme()).toBe('dark')
    })

    it('reads the stored choice', () => {
      localStorage.setItem('eclipse-theme', 'light')
      media.setDark(true)
      const eclipse = setup()
      expect(eclipse.getPreference()).toBe('light')
      expect(eclipse.getTheme()).toBe('light')
    })

    it('falls back to the default for a stale stored value', () => {
      localStorage.setItem('eclipse-theme', 'removed-theme')
      expect(setup({ default: 'dark' }).getTheme()).toBe('dark')
    })
  })

  describe('setTheme', () => {
    it('applies, persists and reports the theme', () => {
      const eclipse = setup()
      const changes: ThemeChange[] = []
      eclipse.onThemeChange((change) => changes.push(change))
      eclipse.setTheme('dark')
      expect(theme()).toBe('dark')
      expect(localStorage.getItem('eclipse-theme')).toBe('dark')
      expect(changes).toEqual([{ theme: 'dark', preference: 'dark' }])
    })

    it('accepts "system" and follows it from then on', () => {
      const eclipse = setup({ default: 'dark' })
      eclipse.setTheme('system')
      expect(eclipse.getPreference()).toBe('system')
      expect(eclipse.getTheme()).toBe('light')
      media.setDark(true)
      expect(eclipse.getTheme()).toBe('dark')
    })

    it('rejects an unknown theme and changes nothing', () => {
      const eclipse = setup()
      expect(() => {
        eclipse.setTheme('neon')
      }).toThrow(RangeError)
      expect(localStorage.getItem('eclipse-theme')).toBeNull()
    })

    it('rejects "system" when the themes cannot follow it', () => {
      const eclipse = setup({ themes: ['sepia', 'ink'], default: 'sepia' })
      expect(() => {
        eclipse.setTheme('system')
      }).toThrow(RangeError)
    })

    it('uses classes in class mode', () => {
      const eclipse = setup({ attribute: 'class', themes: ['light', 'dark', 'sepia'] })
      eclipse.setTheme('sepia')
      expect([...document.documentElement.classList]).toEqual(['sepia'])
      eclipse.setTheme('dark')
      expect([...document.documentElement.classList]).toEqual(['dark'])
    })

    it('persists a new choice even when the shown theme stays the same', () => {
      media.setDark(true)
      const eclipse = setup()
      const changes: ThemeChange[] = []
      eclipse.onThemeChange((change) => changes.push(change))
      eclipse.setTheme('dark')
      expect(localStorage.getItem('eclipse-theme')).toBe('dark')
      expect(changes).toEqual([{ theme: 'dark', preference: 'dark' }])
    })

    it('keeps the choice in memory when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      const eclipse = setup()
      eclipse.setTheme('dark')
      expect(theme()).toBe('dark')
      expect(eclipse.getTheme()).toBe('dark')
      vi.restoreAllMocks()
    })
  })

  describe('toggleTheme', () => {
    it('switches between two themes', () => {
      const eclipse = setup({ default: 'light' })
      eclipse.toggleTheme()
      expect(eclipse.getTheme()).toBe('dark')
      eclipse.toggleTheme()
      expect(eclipse.getTheme()).toBe('light')
    })

    it('cycles through every theme in order', () => {
      const eclipse = setup({ themes: ['light', 'dark', 'sepia'], default: 'light' })
      const seen = [1, 2, 3].map(() => {
        eclipse.toggleTheme()
        return eclipse.getTheme()
      })
      expect(seen).toEqual(['dark', 'sepia', 'light'])
    })

    it('toggles from the resolved theme when the choice is "system"', () => {
      media.setDark(true)
      const eclipse = setup()
      eclipse.toggleTheme()
      expect(eclipse.getTheme()).toBe('light')
      expect(eclipse.getPreference()).toBe('light')
    })
  })

  describe('onThemeChange', () => {
    it('stops calling after unsubscribe', () => {
      const eclipse = setup({ default: 'light' })
      const listener = vi.fn()
      const stop = eclipse.onThemeChange(listener)
      eclipse.setTheme('dark')
      stop()
      eclipse.setTheme('light')
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('on the server', () => {
    it('does nothing without a document', () => {
      const eclipse = setup({ default: 'dark' })
      vi.stubGlobal('document', undefined)
      expect(eclipse.getPreference()).toBe('dark')
      expect(() => {
        eclipse.setTheme('light')
      }).not.toThrow()
      expect(eclipse.onThemeChange(() => {})).toBeTypeOf('function')
      vi.unstubAllGlobals()
    })
  })
})
