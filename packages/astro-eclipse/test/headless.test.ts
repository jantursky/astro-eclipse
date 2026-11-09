import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockMedia, resetDom } from './helpers.js'

const theme = () => document.documentElement.dataset.theme

describe('headless control', () => {
  beforeEach(async () => {
    resetDom()
    mockMedia()
    document.body.innerHTML = `
      <a id="dark" href="#" data-eclipse-set="dark"><span id="inner">Dark</span></a>
      <button id="sepia" data-eclipse-set="sepia" data-duration="0" data-transition="wipe" data-direction="down">Sepia</button>
      <button id="system" data-eclipse-set="system">System</button>
      <button id="bad" data-eclipse-set="neon">Neon</button>
      <button id="plain">Nothing</button>`
    await import('../src/client/headless.js')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('switches the theme when an element with data-eclipse-set is clicked', () => {
    document.getElementById('dark')!.click()
    expect(theme()).toBe('dark')
    expect(localStorage.getItem('eclipse-theme')).toBe('dark')
  })

  it('works from a child of the element', () => {
    document.getElementById('inner')!.click()
    expect(theme()).toBe('dark')
  })

  it('does not follow an anchor that is used as a control', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    document.getElementById('dark')!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('accepts per-element options and the system value', () => {
    document.getElementById('sepia')!.click()
    expect(theme()).toBe('sepia')
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    localStorage.clear()
    document.getElementById('system')!.click()
    expect(localStorage.getItem('eclipse-theme')).toBe('system')
  })

  it('reports an unknown value in the console and changes nothing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const before = theme()
    document.getElementById('bad')!.click()
    expect(error).toHaveBeenCalledOnce()
    expect(String(error.mock.calls[0]![0])).toContain('neon')
    expect(theme()).toBe(before)
  })

  it('ignores a click that does not come from an element', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores clicks elsewhere', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    document.getElementById('plain')!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(localStorage.getItem('eclipse-theme')).toBeNull()
  })
})
