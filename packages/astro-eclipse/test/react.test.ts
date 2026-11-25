import { createElement, StrictMode, act } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setTheme } from '../src/client/index.js'
import { useTheme } from '../src/react.js'
import { mockMedia, resetDom } from './helpers.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Probe() {
  const { theme, preference, themes, systemTheme } = useTheme()
  return createElement('p', { id: 'out' }, `${theme}|${preference}|${themes.join(',')}|${systemTheme}`)
}

let media: ReturnType<typeof mockMedia>
beforeAll(() => {
  media = mockMedia()
})
afterEach(() => {
  media.setDark(false)
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  resetDom()
})

const out = () => document.getElementById('out')?.textContent

describe('react useTheme', () => {
  it('reacts to setTheme and tells preference from theme', () => {
    const container = document.body.appendChild(document.createElement('div'))
    const root = createRoot(container)
    act(() => {
      root.render(createElement(Probe))
    })
    expect(out()).toBe('light|light|light,dark,sepia|light')
    act(() => {
      setTheme('dark')
    })
    expect(out()).toBe('dark|dark|light,dark,sepia|light')
    media.setDark(true)
    act(() => {
      setTheme('system')
    })
    expect(out()).toBe('dark|system|light,dark,sepia|dark')
    act(() => {
      root.unmount()
    })
  })

  it('removes its listener on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const container = document.body.appendChild(document.createElement('div'))
    const root = createRoot(container)
    act(() => {
      root.render(createElement(Probe))
    })
    act(() => {
      root.unmount()
    })
    expect(remove).toHaveBeenCalledWith('eclipse:change', expect.any(Function))
  })

  it('is undefined on the server and hydrates without a mismatch', () => {
    const html = renderToString(createElement(Probe))
    expect(html).toContain('undefined|undefined|light,dark,sepia|undefined')
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const container = document.body.appendChild(document.createElement('div'))
    container.innerHTML = html
    let root!: ReturnType<typeof hydrateRoot>
    act(() => {
      root = hydrateRoot(container, createElement(StrictMode, null, createElement(Probe)))
    })
    expect(errors).not.toHaveBeenCalled()
    expect(out()).toBe('light|light|light,dark,sepia|light')
    act(() => {
      root.unmount()
    })
  })
})
