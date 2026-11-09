import config from 'virtual:astro-eclipse/config'

import { createEclipse } from './core.js'

export type { ThemeChange, SetThemeOptions } from './core.js'
export type { Origin, Point } from './origin.js'
export { defineTransition, getTransition } from './transitions.js'
export type { Direction, TransitionContext, TransitionDefinition } from './transitions.js'

export const { setTheme, toggleTheme, getTheme, getPreference, onThemeChange, getSystemTheme, getForced, themes } =
  createEclipse(config)
