import { createApp, createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setTheme } from '../src/client/index.js'
import { useTheme } from '../src/vue.js'
import { mockMedia, resetDom } from './helpers.js'

const Probe = defineComponent({
  setup() {
    const { theme, preference, themes, systemTheme } = useTheme()
    return () => h('p', { id: 'out' }, `${theme.value}|${preference.value}|${themes.join(',')}|${systemTheme.value}`)
  },
})

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
const mount = () => {
  const el = document.body.appendChild(document.createElement('div'))
  const app = createApp(Probe)
  app.mount(el)
  return app
}

describe('vue useTheme', () => {
  it('reacts to setTheme and tells preference from theme', async () => {
    const app = mount()
    await nextTick()
    expect(out()).toBe('light|light|light,dark,sepia|light')
    setTheme('dark')
    await nextTick()
    expect(out()).toBe('dark|dark|light,dark,sepia|light')
    media.setDark(true)
    setTheme('system')
    await nextTick()
    expect(out()).toBe('dark|system|light,dark,sepia|dark')
    app.unmount()
  })

  it('removes its listener on unmount', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const app = mount()
    await nextTick()
    app.unmount()
    expect(remove).toHaveBeenCalledWith('eclipse:change', expect.any(Function))
  })

  it('is undefined on the server and hydrates without a mismatch', async () => {
    const html = await renderToString(createSSRApp(Probe))
    expect(html).toContain('undefined|undefined|light,dark,sepia|undefined')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const el = document.body.appendChild(document.createElement('div'))
    el.innerHTML = html
    const app = createSSRApp(Probe)
    app.mount(el)
    await nextTick()
    expect(warn).not.toHaveBeenCalled()
    expect(out()).toBe('light|light|light,dark,sepia|light')
    app.unmount()
  })
})
