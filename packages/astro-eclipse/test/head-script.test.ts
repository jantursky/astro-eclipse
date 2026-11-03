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

  it('stays small', () => {
    expect(buildHeadScript(config()).length).toBeLessThan(1100)
  })

  it('escapes anything that could close the script tag', () => {
    expect(buildHeadScript(config({ storageKey: '</script><b>' }))).not.toContain('</script>')
  })
})
