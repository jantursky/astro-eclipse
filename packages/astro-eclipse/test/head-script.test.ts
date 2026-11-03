import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildHeadScript } from '../src/head-script.js'
import { config, mockMedia, resetDom } from './helpers.js'

import type { EclipseOptions } from '../src/config.js'

function runHeadScript(options?: EclipseOptions): void {
  // The script is plain code meant to run in a page, so evaluating it is the test.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  new Function(buildHeadScript(config(options)))()
}

describe('head script', () => {
  let media: ReturnType<typeof mockMedia>
  beforeEach(() => {
    resetDom()
    media = mockMedia()
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
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    media.setDark(true)
    runHeadScript()
    expect(document.documentElement.dataset.theme).toBe('dark')
    vi.restoreAllMocks()
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
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'x' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('sets the theme on the incoming document before an Astro swap', () => {
    localStorage.setItem('eclipse-theme', 'dark')
    runHeadScript()
    const newDocument = document.implementation.createHTMLDocument('next')
    document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument }))
    expect(newDocument.documentElement.dataset.theme).toBe('dark')
  })

  it('stays small', () => {
    expect(buildHeadScript(config()).length).toBeLessThan(900)
  })

  it('escapes anything that could close the script tag', () => {
    expect(buildHeadScript(config({ storageKey: '</script><b>' }))).not.toContain('</script>')
  })
})
