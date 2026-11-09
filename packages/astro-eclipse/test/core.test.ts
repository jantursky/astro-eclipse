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

  describe('without a document (server render)', () => {
    it('reads the default and ignores writes and subscriptions', () => {
      vi.stubGlobal('document', undefined)
      const eclipse = setup({ default: 'dark' })
      expect(eclipse.getPreference()).toBe('dark')
      expect(() => {
        eclipse.setTheme('light')
      }).not.toThrow()
      const stop = eclipse.onThemeChange(() => undefined)
      expect(() => {
        stop()
      }).not.toThrow()
    })
  })

  describe('getSystemTheme and themes', () => {
    it('reports the OS scheme whatever the visitor chose', () => {
      media.setDark(true)
      localStorage.setItem('eclipse-theme', 'light')
      const eclipse = setup()
      expect(eclipse.getSystemTheme()).toBe('dark')
      expect(eclipse.getTheme()).toBe('light')
      media.setDark(false)
      expect(eclipse.getSystemTheme()).toBe('light')
    })

    it('is light where matchMedia is missing', () => {
      vi.stubGlobal('matchMedia', undefined)
      expect(setup().getSystemTheme()).toBe('light')
    })

    it('lists the configured themes in order, without system', () => {
      const eclipse = setup({ themes: ['light', 'dark', 'sepia'] })
      expect(eclipse.themes).toEqual(['light', 'dark', 'sepia'])
      expect(eclipse.themes).not.toContain('system')
    })

    it('hands out a list that cannot be changed', () => {
      const eclipse = setup()
      expect(Object.isFrozen(eclipse.themes)).toBe(true)
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

  describe('value mapping', () => {
    const cases: [string, EclipseOptions][] = [
      ['attribute', { values: { dark: 'theme-dark', sepia: 'warm' } }],
      [
        'class',
        { attribute: 'class', themes: ['light', 'dark', 'sepia'], values: { dark: 'dark night', sepia: 'night warm' } },
      ],
    ]

    it.each(cases)('applies the mapped value (%s mode), keeping theme names in the API', (_mode, options) => {
      const eclipse = setup({ themes: ['light', 'dark', 'sepia'], ...options })
      eclipse.setTheme('dark')
      expect(eclipse.getTheme()).toBe('dark')
      expect(eclipse.getPreference()).toBe('dark')
      expect(localStorage.getItem('eclipse-theme')).toBe('dark')
    })

    it.each(cases)('writes the same DOM as the head script for every theme (%s mode)', (_mode, options) => {
      const full = { themes: ['light', 'dark', 'sepia'], ...options }
      const dom = () => document.documentElement.outerHTML.replace(/<head>.*<\/head>/, '')
      for (const name of ['light', 'dark', 'sepia']) {
        resetDom()
        setup(full).setTheme(name)
        const fromClient = dom()

        resetDom()
        localStorage.setItem('eclipse-theme', name)
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
        new Function(buildHeadScript(config(full)))()
        expect(dom()).toBe(fromClient)
      }
    })

    it('moves a class the previous theme shared to the new one', () => {
      const eclipse = setup({
        themes: ['light', 'dark', 'sepia'],
        attribute: 'class',
        values: { dark: 'dark shared', sepia: 'shared warm' },
      })
      eclipse.setTheme('dark')
      eclipse.setTheme('sepia')
      expect([...document.documentElement.classList].sort()).toEqual(['shared', 'warm'])
    })
  })

  describe('forced theme', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
      document.documentElement.removeAttribute('data-eclipse-forced')
    })

    it('getTheme returns the forced theme and getPreference the stored one', () => {
      localStorage.setItem('eclipse-theme', 'light')
      document.documentElement.setAttribute('data-eclipse-forced', 'dark')
      const eclipse = setup({ forcedTheme: true })
      expect(eclipse.getTheme()).toBe('dark')
      expect(eclipse.getPreference()).toBe('light')
      expect(eclipse.getForced()).toBe('dark')
    })

    it('ignores the attribute when the option is off or the value is unknown', () => {
      localStorage.setItem('eclipse-theme', 'light')
      document.documentElement.setAttribute('data-eclipse-forced', 'dark')
      expect(setup().getTheme()).toBe('light')
      document.documentElement.setAttribute('data-eclipse-forced', 'purple')
      expect(setup({ forcedTheme: true }).getTheme()).toBe('light')
      expect(setup({ forcedTheme: true }).getForced()).toBeUndefined()
    })

    it('setTheme stores the choice but does not apply it, and reports forced', () => {
      document.documentElement.setAttribute('data-eclipse-forced', 'dark')
      document.documentElement.dataset.theme = 'dark'
      const eclipse = setup({ forcedTheme: true })
      const seen: ThemeChange[] = []
      eclipse.onThemeChange((change) => seen.push(change))
      eclipse.setTheme('light')
      expect(theme()).toBe('dark')
      expect(localStorage.getItem('eclipse-theme')).toBe('light')
      expect(eclipse.getPreference()).toBe('light')
      expect(seen).toEqual([{ theme: 'dark', preference: 'light', forced: 'dark' }])
    })

    it('reports forced as undefined on an unforced page', () => {
      const eclipse = setup({ forcedTheme: true })
      const seen: ThemeChange[] = []
      eclipse.onThemeChange((change) => seen.push(change))
      eclipse.setTheme('dark')
      expect(seen).toEqual([{ theme: 'dark', preference: 'dark', forced: undefined }])
    })

    it('has no forced theme without a document', () => {
      vi.stubGlobal('document', undefined)
      expect(setup({ forcedTheme: true }).getForced()).toBeUndefined()
    })
  })
})
