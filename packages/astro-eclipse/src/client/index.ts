import config from 'virtual:astro-eclipse/config'

import { createEclipse } from './core.js'

export type { ThemeChange, SetThemeOptions } from './core.js'
export type { Origin, Point } from '@penumbra/core'
export { defineTransition, getTransition } from '@penumbra/core'
export type { Direction, TransitionContext, TransitionDefinition } from '@penumbra/core'

export const { setTheme, toggleTheme, getTheme, getPreference, onThemeChange, getSystemTheme, getForced, themes } =
  createEclipse(config)
