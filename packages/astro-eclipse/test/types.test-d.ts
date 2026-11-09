import { describe, expectTypeOf, it } from 'vitest'

import eclipse, { type ColorScheme, type EclipseConfig, type EclipseOptions } from '../src/index.js'
import { defineTransition, type Direction, type TransitionDefinition } from '../src/client/transitions.js'
import { createEclipse, type Eclipse, type SetThemeOptions, type ThemeChange } from '../src/client/core.js'
import type { Origin, Point } from '../src/client/origin.js'

// Components are `.astro` files, which tsc cannot see into. Their props are checked by `astro check` in apps/example.

describe('astro-eclipse entry', () => {
  it('eclipse() takes optional options and returns an integration', () => {
    expectTypeOf(eclipse).parameter(0).toEqualTypeOf<EclipseOptions | undefined>()
    expectTypeOf(eclipse()).toHaveProperty('name').toBeString()
    expectTypeOf(eclipse()).toHaveProperty('hooks')
  })

  it('options are all optional', () => {
    expectTypeOf<Required<EclipseOptions>>().not.toEqualTypeOf<EclipseOptions>()
    expectTypeOf<Partial<EclipseOptions>>().toExtend<EclipseOptions>()
  })

  it('attribute is "class" or a data-* name', () => {
    expectTypeOf<EclipseOptions['attribute']>().toEqualTypeOf<'class' | `data-${string}` | undefined>()
    // @ts-expect-error -- `id` is not a valid attribute
    eclipse({ attribute: 'id' })
  })

  it('colorScheme maps themes to light or dark only', () => {
    expectTypeOf<ColorScheme>().toEqualTypeOf<'light' | 'dark'>()
    expectTypeOf<EclipseOptions['colorScheme']>().toEqualTypeOf<Record<string, ColorScheme> | undefined>()
    // @ts-expect-error -- `sepia` is not a color scheme
    eclipse({ colorScheme: { sepia: 'sepia' } })
  })

  it('themeColor maps themes to strings', () => {
    expectTypeOf<EclipseOptions['themeColor']>().toEqualTypeOf<Record<string, string> | undefined>()
  })

  it('the resolved config has every option set', () => {
    expectTypeOf<EclipseConfig['themes']>().toEqualTypeOf<string[]>()
    expectTypeOf<EclipseConfig['duration']>().toBeNumber()
    expectTypeOf<EclipseConfig['storageKey']>().toBeString()
  })
})

describe('astro-eclipse/client', () => {
  it('SetThemeOptions.direction is the four directions, not any string', () => {
    expectTypeOf<SetThemeOptions['direction']>().toEqualTypeOf<Direction | undefined>()
    expectTypeOf<Direction>().toEqualTypeOf<'up' | 'down' | 'left' | 'right'>()
    // @ts-expect-error -- `sideways` is not a direction
    expectTypeOf<SetThemeOptions>().toExtend<{ direction: 'sideways' }>()
  })

  it('SetThemeOptions.origin takes a click, an element, a point or "center"', () => {
    expectTypeOf<SetThemeOptions['origin']>().toEqualTypeOf<Origin | undefined>()
    expectTypeOf<Origin>().toEqualTypeOf<MouseEvent | Element | Point | 'center'>()
  })

  it('ThemeChange reports the applied theme and the preference', () => {
    expectTypeOf<ThemeChange>().toEqualTypeOf<{ theme: string; preference: string }>()
  })

  it('the API has the documented functions', () => {
    const api = createEclipse({} as EclipseConfig)
    expectTypeOf(api).toEqualTypeOf<Eclipse>()
    expectTypeOf(api.setTheme).parameters.toEqualTypeOf<[preference: string, options?: SetThemeOptions]>()
    expectTypeOf(api.toggleTheme).parameters.toEqualTypeOf<[options?: SetThemeOptions]>()
    expectTypeOf(api.getTheme).returns.toBeString()
    expectTypeOf(api.getPreference).returns.toBeString()
    expectTypeOf(api.onThemeChange).parameter(0).toEqualTypeOf<(change: ThemeChange) => void>()
    expectTypeOf(api.onThemeChange).returns.toEqualTypeOf<() => void>()
  })

  it('defineTransition takes a name and a definition and returns the definition', () => {
    expectTypeOf(defineTransition).parameters.toEqualTypeOf<[name: string, definition: TransitionDefinition]>()
    expectTypeOf(defineTransition).returns.toEqualTypeOf<TransitionDefinition>()
    expectTypeOf<TransitionDefinition['top']>().toEqualTypeOf<'old' | 'new' | undefined>()
  })
})
