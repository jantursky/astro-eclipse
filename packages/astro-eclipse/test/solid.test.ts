import { createRoot } from 'solid-js'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setTheme } from '../src/client/index.js'
import { useTheme } from '../src/solid.js'
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

const read = (hook: ReturnType<typeof useTheme>) =>
  `${hook.theme()}|${hook.preference()}|${hook.themes.join(',')}|${hook.systemTheme()}`

// `onMount` runs once the root has finished, so the hook is created inside it and read after it returns.
function mount() {
  let hook!: ReturnType<typeof useTheme>
  let dispose!: () => void
  createRoot((d) => {
    dispose = d
    hook = useTheme()
    expect(read(hook)).toBe('undefined|undefined|light,dark,sepia|undefined')
  })
  return { hook, dispose }
}

// Hydration: Solid's server and browser builds cannot load in one test file, so no SSR render is compared here.
// What makes it hydration safe is asserted instead: every value is `undefined` until the component mounts.
describe('solid useTheme', () => {
  it('is undefined before mount, then reacts to setTheme and tells preference from theme', () => {
    const { hook, dispose } = mount()
    expect(read(hook)).toBe('light|light|light,dark,sepia|light')
    setTheme('dark')
    expect(read(hook)).toBe('dark|dark|light,dark,sepia|light')
    media.setDark(true)
    setTheme('system')
    expect(read(hook)).toBe('dark|system|light,dark,sepia|dark')
    dispose()
  })

  it('removes its listener on cleanup', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    mount().dispose()
    expect(remove).toHaveBeenCalledWith('eclipse:change', expect.any(Function))
  })
})
