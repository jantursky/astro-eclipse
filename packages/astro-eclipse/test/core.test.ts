import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createEclipse, type ThemeChange } from '../src/client/core.js'
import { buildHeadScript } from '../src/head-script.js'
import { blockStorage, config, mockMedia, resetDom } from './helpers.js'

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
  afterEach(() => {
    vi.unstubAllGlobals()
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

    it('keeps a new choice when the write fails over an older stored value', () => {
      localStorage.setItem('eclipse-theme', 'dark')
      const eclipse = setup()
      blockStorage({ write: true })
      eclipse.setTheme('light')
      expect(eclipse.getTheme()).toBe('light')
      expect(theme()).toBe('light')
      vi.unstubAllGlobals()
      // A write that works again takes over from the unsaved choice.
      eclipse.setTheme('dark')
      expect(localStorage.getItem('eclipse-theme')).toBe('dark')
      localStorage.setItem('eclipse-theme', 'light')
      expect(eclipse.getTheme()).toBe('light')
    })

    it('keeps the choice in memory when localStorage throws', () => {
      blockStorage({ read: true, write: true })
      const eclipse = setup()
      eclipse.setTheme('dark')
      expect(theme()).toBe('dark')
      expect(eclipse.getTheme()).toBe('dark')
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

  describe('color scheme and theme color', () => {
    const chrome: EclipseOptions = {
      themes: ['light', 'dark', 'sepia'],
      colorScheme: { light: 'light', dark: 'dark' },
      themeColor: { light: '#fff', dark: '#111' },
    }
    const scheme = (root: HTMLElement = document.documentElement) => root.style.getPropertyValue('color-scheme')
    const color = () => document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')

    it('updates both with the theme', () => {
      const eclipse = setup(chrome)
      eclipse.setTheme('dark')
      expect(scheme()).toBe('dark')
      expect(color()).toBe('#111')
      eclipse.setTheme('light')
      expect(scheme()).toBe('light')
      expect(color()).toBe('#fff')
    })

    it('clears the scheme for an unmapped theme and leaves the meta', () => {
      const eclipse = setup(chrome)
      eclipse.setTheme('dark')
      eclipse.setTheme('sepia')
      expect(scheme()).toBe('')
      expect(color()).toBe('#111')
    })

    it('writes nothing when the options are absent', () => {
      setup().setTheme('dark')
      expect(scheme()).toBe('')
      expect(document.head.querySelector('meta[name="theme-color"]')).toBeNull()
    })

    it('agrees with the head script for every theme', () => {
      for (const name of ['light', 'dark', 'sepia']) {
        resetDom()
        document.documentElement.style.removeProperty('color-scheme')
        setup(chrome).setTheme(name)
        const fromClient = [scheme(), color()]

        resetDom()
        document.documentElement.style.removeProperty('color-scheme')
        localStorage.setItem('eclipse-theme', name)
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
        new Function(buildHeadScript(config(chrome)))()
        expect([scheme(), color()]).toEqual(fromClient)
      }
    })
  })
})
