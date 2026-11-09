import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildHeadScript } from '../src/head-script.js'
import { blockStorage, config, mockMedia, resetDom } from './helpers.js'

import type { EclipseOptions } from '../src/config.js'

function runHeadScript(options?: EclipseOptions): void {
  // The script is plain code meant to run in a page, so evaluating it is the test.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  new Function(buildHeadScript(config(options)))()
}

describe('head script', () => {
  let media: ReturnType<typeof mockMedia>
  const added: [EventTarget, string, EventListenerOrEventListenerObject][] = []

  beforeEach(() => {
    resetDom()
    media = mockMedia()
    // Each run adds listeners to the shared window and document. Record them so they can be removed.
    for (const target of [window, document]) {
      const original = target.addEventListener.bind(target)
      vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
        added.push([target, type, listener])
        original(type, listener, options)
      })
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    for (const [target, type, listener] of added.splice(0)) target.removeEventListener(type, listener)
  })

  it('follows the system theme when nothing is stored', () => {
    media.setDark(true)
    runHeadScript()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('prefers the stored theme over the system', () => {
    media.setDark(true)
    localStorage.setItem('eclipse-theme', 'light')
    runHeadScript()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('ignores a stored value that is not a theme', () => {
    localStorage.setItem('eclipse-theme', 'neon')
    runHeadScript({ default: 'dark' })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('ignores a stored "system" when the themes cannot follow it', () => {
    localStorage.setItem('eclipse-theme', 'system')
    runHeadScript({ themes: ['sepia', 'ink'], default: 'ink' })
    expect(document.documentElement.dataset.theme).toBe('ink')
  })

  it('keeps working when localStorage throws', () => {
    blockStorage({ read: true })
    media.setDark(true)
    runHeadScript()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('sets exactly one class in class mode', () => {
    document.documentElement.className = 'light keep'
    localStorage.setItem('eclipse-theme', 'dark')
    runHeadScript({ attribute: 'class' })
    expect([...document.documentElement.classList].sort()).toEqual(['dark', 'keep'])
  })

  it('follows live system changes only while the choice is "system"', () => {
    runHeadScript()
    const changes: unknown[] = []
    document.addEventListener('eclipse:change', (event) => changes.push((event as CustomEvent).detail))
    media.setDark(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(changes).toEqual([{ theme: 'dark', preference: 'system' }])

    localStorage.setItem('eclipse-theme', 'light')
    document.documentElement.dataset.theme = 'light'
    media.setDark(false)
    media.setDark(true)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(changes).toHaveLength(1)
  })

  it('applies a change made in another tab', () => {
    runHeadScript()
    localStorage.setItem('eclipse-theme', 'dark')
    window.dispatchEvent(new StorageEvent('storage', { key: 'eclipse-theme', newValue: 'dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('ignores storage changes to other keys', () => {
    runHeadScript()
    localStorage.setItem('eclipse-theme', 'dark')
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'x' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('reapplies when another tab clears all of localStorage', () => {
    localStorage.setItem('eclipse-theme', 'dark')
    runHeadScript()
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('keeps the theme on the page across a swap when storage cannot be read', () => {
    document.documentElement.dataset.theme = 'dark'
    blockStorage({ read: true })
    runHeadScript({ default: 'light' })
    expect(document.documentElement.dataset.theme).toBe('dark')
    const newDocument = document.implementation.createHTMLDocument('next')
    document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument }))
    expect(newDocument.documentElement.dataset.theme).toBe('dark')
  })

  it('keeps the class on the page across a swap when storage cannot be read', () => {
    document.documentElement.className = 'sepia'
    blockStorage({ read: true })
    runHeadScript({ themes: ['light', 'dark', 'sepia'], attribute: 'class', default: 'light' })
    const newDocument = document.implementation.createHTMLDocument('next')
    document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument }))
    expect([...newDocument.documentElement.classList]).toEqual(['sepia'])
  })

  it('sets the theme on the incoming document before an Astro swap', () => {
    localStorage.setItem('eclipse-theme', 'dark')
    runHeadScript()
    const newDocument = document.implementation.createHTMLDocument('next')
    document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument }))
    expect(newDocument.documentElement.dataset.theme).toBe('dark')
  })

  describe('color scheme and theme color', () => {
    const chrome = {
      themes: ['light', 'dark', 'sepia'],
      colorScheme: { light: 'light', dark: 'dark' },
      themeColor: { light: '#fff', dark: '#111' },
    } as const satisfies EclipseOptions
    const options = (): EclipseOptions => ({ ...chrome, colorScheme: { ...chrome.colorScheme } })
    const scheme = (root: HTMLElement = document.documentElement) => root.style.getPropertyValue('color-scheme')
    const metas = (doc: Document = document) => [...doc.head.querySelectorAll('meta[name="theme-color"]')]

    it('sets both before first paint', () => {
      localStorage.setItem('eclipse-theme', 'dark')
      runHeadScript(options())
      expect(scheme()).toBe('dark')
      expect(metas().map((meta) => meta.getAttribute('content'))).toEqual(['#111'])
    })

    it('updates the existing meta instead of adding another', () => {
      document.head.innerHTML = '<meta name="theme-color" content="#abc">'
      localStorage.setItem('eclipse-theme', 'light')
      runHeadScript(options())
      expect(metas().map((meta) => meta.getAttribute('content'))).toEqual(['#fff'])
    })

    it('leaves a meta with a media query alone and adds its own', () => {
      document.head.innerHTML = '<meta name="theme-color" content="#abc" media="(min-width: 1px)">'
      localStorage.setItem('eclipse-theme', 'dark')
      runHeadScript(options())
      expect(metas().map((meta) => meta.getAttribute('content'))).toEqual(['#abc', '#111'])
    })

    it('clears the color scheme and keeps the meta for an unmapped theme', () => {
      localStorage.setItem('eclipse-theme', 'dark')
      runHeadScript(options())
      localStorage.setItem('eclipse-theme', 'sepia')
      window.dispatchEvent(new StorageEvent('storage', { key: 'eclipse-theme' }))
      expect(scheme()).toBe('')
      expect(metas().map((meta) => meta.getAttribute('content'))).toEqual(['#111'])
    })

    it('follows the system theme live', () => {
      runHeadScript({ ...options(), default: 'system' })
      media.setDark(true)
      expect(scheme()).toBe('dark')
      expect(metas()[0]?.getAttribute('content')).toBe('#111')
    })

    it('prepares the incoming document on an Astro swap', () => {
      localStorage.setItem('eclipse-theme', 'dark')
      runHeadScript(options())
      const newDocument = document.implementation.createHTMLDocument('next')
      document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument }))
      expect(scheme(newDocument.documentElement)).toBe('dark')
      expect(metas(newDocument).map((meta) => meta.getAttribute('content'))).toEqual(['#111'])
    })

    it('emits no color code when the options are absent', () => {
      expect(buildHeadScript(config())).not.toContain('setProperty')
      expect(buildHeadScript(config())).not.toContain('createElement')
    })

    it('stays within the 1 kB budget gzip with both options on', async () => {
      const { gzipSync } = await import('node:zlib')
      expect(gzipSync(buildHeadScript(config(options()))).length).toBeLessThan(1000)
    })
  })

  it('stays small', () => {
    expect(buildHeadScript(config()).length).toBeLessThan(1100)
  })

  it('escapes anything that could close the script tag', () => {
    expect(buildHeadScript(config({ storageKey: '</script><b>' }))).not.toContain('</script>')
  })

  describe('forced theme', () => {
    const force = (value: string | null, root: Element = document.documentElement) => {
      if (value === null) root.removeAttribute('data-eclipse-forced')
      else root.setAttribute('data-eclipse-forced', value)
    }
    afterEach(() => {
      document.documentElement.removeAttribute('data-eclipse-forced')
    })

    it('paints the forced theme and leaves the stored choice alone', () => {
      localStorage.setItem('eclipse-theme', 'light')
      force('dark')
      runHeadScript({ forcedTheme: true })
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(localStorage.getItem('eclipse-theme')).toBe('light')
    })

    it('ignores a value that is not a theme', () => {
      localStorage.setItem('eclipse-theme', 'light')
      force('purple')
      runHeadScript({ forcedTheme: true })
      expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('ignores the attribute when the option is off', () => {
      localStorage.setItem('eclipse-theme', 'light')
      force('dark')
      runHeadScript()
      expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('forces the incoming document on a swap, and restores the choice for an unforced one', () => {
      localStorage.setItem('eclipse-theme', 'light')
      runHeadScript({ forcedTheme: true })
      const forced = document.implementation.createHTMLDocument('')
      force('dark', forced.documentElement)
      document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument: forced }))
      expect(forced.documentElement.dataset.theme).toBe('dark')

      const plain = document.implementation.createHTMLDocument('')
      document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument: plain }))
      expect(plain.documentElement.dataset.theme).toBe('light')
    })

    it('keeps the forced theme on a storage event and reports it', () => {
      localStorage.setItem('eclipse-theme', 'light')
      force('dark')
      runHeadScript({ forcedTheme: true })
      const seen: unknown[] = []
      document.addEventListener('eclipse:change', (event) => seen.push((event as CustomEvent).detail))
      localStorage.setItem('eclipse-theme', 'light')
      window.dispatchEvent(new StorageEvent('storage', { key: 'eclipse-theme', newValue: 'light' }))
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(seen).toEqual([{ theme: 'dark', preference: 'light', forced: 'dark' }])
    })

    it('reports forced as undefined on an unforced page', () => {
      localStorage.setItem('eclipse-theme', 'light')
      runHeadScript({ forcedTheme: true })
      const seen: unknown[] = []
      document.addEventListener('eclipse:change', (event) => seen.push((event as CustomEvent).detail))
      window.dispatchEvent(new StorageEvent('storage', { key: 'eclipse-theme' }))
      expect(seen).toEqual([{ theme: 'light', preference: 'light', forced: undefined }])
    })

    it('adds nothing to the default output', () => {
      expect(buildHeadScript(config())).not.toContain('data-eclipse-forced')
      expect(buildHeadScript(config({ forcedTheme: true }))).toContain('data-eclipse-forced')
    })
  })

  describe('value mapping', () => {
    const themes = ['light', 'dark', 'sepia']
    const classes = () => [...document.documentElement.classList].sort()

    it('writes the mapped value to the attribute', () => {
      localStorage.setItem('eclipse-theme', 'dark')
      runHeadScript({ values: { dark: 'theme-dark' } })
      expect(document.documentElement.dataset.theme).toBe('theme-dark')
      expect(localStorage.getItem('eclipse-theme')).toBe('dark')
    })

    it('falls back to the theme name for a theme without an entry', () => {
      localStorage.setItem('eclipse-theme', 'light')
      runHeadScript({ values: { dark: 'theme-dark' } })
      expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('adds several classes and removes the other themes in class mode', () => {
      document.documentElement.className = 'light theme-day other'
      localStorage.setItem('eclipse-theme', 'dark')
      runHeadScript({
        themes,
        attribute: 'class',
        values: { light: 'light theme-day', dark: 'dark theme-night' },
      })
      expect(classes()).toEqual(['dark', 'other', 'theme-night'])
    })

    it('lets the applied theme win a class that two themes share', () => {
      localStorage.setItem('eclipse-theme', 'sepia')
      runHeadScript({ themes, attribute: 'class', values: { dark: 'dark shared', sepia: 'shared warm' } })
      expect(classes()).toEqual(['shared', 'warm'])
    })

    it('recognises the current theme from a mapped attribute value when storage cannot be read', () => {
      document.documentElement.dataset.theme = 'theme-dark'
      blockStorage({ read: true })
      runHeadScript({ default: 'light', values: { dark: 'theme-dark' } })
      expect(document.documentElement.dataset.theme).toBe('theme-dark')
    })

    it('recognises the current theme from mapped classes, preferring the most specific theme', () => {
      document.documentElement.className = 'dark theme-night'
      blockStorage({ read: true })
      // `light` is listed last and maps to a class the page lacks, `sepia` shares `dark`: the longer match wins.
      runHeadScript({
        themes: ['dark', 'sepia', 'light'],
        attribute: 'class',
        default: 'light',
        values: { dark: 'dark', sepia: 'dark theme-night' },
      })
      expect(classes()).toEqual(['dark', 'theme-night'])
    })

    it('applies the mapped value to the incoming document on a swap', () => {
      localStorage.setItem('eclipse-theme', 'dark')
      runHeadScript({ values: { dark: 'theme-dark' } })
      const newDocument = document.implementation.createHTMLDocument('next')
      document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument }))
      expect(newDocument.documentElement.dataset.theme).toBe('theme-dark')
    })

    it('adds nothing to the output without the option', () => {
      expect(buildHeadScript(config())).not.toContain('split')
      expect(buildHeadScript(config({ values: { dark: 'x' } }))).toContain('split')
    })
  })
})
