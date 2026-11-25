import { mount, unmount, flushSync } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setTheme } from '../src/client/index.js'
import { useTheme } from '../src/svelte.js'
import { mockMedia, resetDom } from './helpers.js'

let media: ReturnType<typeof mockMedia>
beforeAll(() => {
  media = mockMedia()
})
afterEach(() => {
  media.setDark(false)
  vi.restoreAllMocks()
  resetDom()
})

// A component is just a function of an anchor in Svelte 5; this one calls the hook the way a `.svelte` file would.
function harness() {
  let hook!: ReturnType<typeof useTheme>
  const component = (() => {
    hook = useTheme()
  }) as never
  const app = mount(component, { target: document.body })
  return { hook: () => hook, app }
}
const read = (hook: ReturnType<typeof useTheme>) =>
  `${get(hook.theme)}|${get(hook.preference)}|${hook.themes.join(',')}|${get(hook.systemTheme)}`

// Hydration: Svelte's server and browser builds cannot load in one test file, so no SSR render is compared here.
// What makes it hydration safe is asserted instead: every value is `undefined` until the component mounts.
describe('svelte useTheme', () => {
  it('reacts to setTheme and tells preference from theme', () => {
    const { hook, app } = harness()
    flushSync()
    expect(read(hook())).toBe('light|light|light,dark,sepia|light')
    setTheme('dark')
    expect(read(hook())).toBe('dark|dark|light,dark,sepia|light')
    media.setDark(true)
    setTheme('system')
    expect(read(hook())).toBe('dark|system|light,dark,sepia|dark')
    void unmount(app)
  })

  it('removes its listener on destroy', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const { app } = harness()
    flushSync()
    void unmount(app)
    expect(remove).toHaveBeenCalledWith('eclipse:change', expect.any(Function))
  })

  it('is undefined before mount', () => {
    let hook!: ReturnType<typeof useTheme>
    // Outside a component `onMount` does nothing on the server; reading the stores before it runs gives undefined.
    const component = (() => {
      hook = useTheme()
      expect(read(hook)).toBe('undefined|undefined|light,dark,sepia|undefined')
    }) as never
    const app = mount(component, { target: document.body })
    void unmount(app)
  })
})
