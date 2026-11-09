import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createEclipse } from '../src/client/core.js'
import { buildHeadScript } from '../src/head-script.js'
import { config, mockMedia, resetDom } from './helpers.js'

import type { EclipseOptions } from '../src/config.js'

// The migration guide tells people to set `storageKey` to the key their old tool used, so that visitors keep their
// saved theme. These tests pin the two keys and value shapes the guide names: astro-color-scheme 1.1.6 stores
// `light`, `dark` or `system` under `theme`; astro-theme-toggle 0.8.2 stores `light` or `dark` under `theme-toggle`.
const run = (options: EclipseOptions): void => {
  // The script is plain code meant to run in a page, so evaluating it is the test.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  new Function(buildHeadScript(config(options)))()
}

describe('keeping the saved theme when migrating', () => {
  let media: ReturnType<typeof mockMedia>
  beforeEach(() => {
    resetDom()
    media = mockMedia()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['astro-color-scheme', 'theme', 'dark', 'dark'],
    ['astro-color-scheme', 'theme', 'light', 'light'],
    ['astro-color-scheme', 'theme', 'system', 'dark'],
    ['astro-theme-toggle', 'theme-toggle', 'dark', 'dark'],
    ['astro-theme-toggle', 'theme-toggle', 'light', 'light'],
  ])('%s: a stored "%s" value of %s is read as the %s theme', (_tool, storageKey, stored, applied) => {
    media.setDark(true)
    localStorage.setItem(storageKey, stored)
    run({ storageKey })
    expect(document.documentElement.dataset.theme).toBe(applied)
    expect(createEclipse(config({ storageKey })).getTheme()).toBe(applied)
    expect(createEclipse(config({ storageKey })).getPreference()).toBe(stored)
  })

  it('an unmigrated key is ignored and the default applies', () => {
    media.setDark(false)
    localStorage.setItem('theme', 'dark')
    run({})
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
