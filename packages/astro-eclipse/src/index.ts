import type { AstroIntegration } from 'astro'

import { resolveConfig, type EclipseConfig, type EclipseOptions } from './config.js'
import { buildHeadScript } from './head-script.js'

export type { ColorScheme, EclipseConfig, EclipseOptions } from './config.js'

const VIRTUAL_ID = 'virtual:astro-eclipse/config'

export default function eclipse(options: EclipseOptions = {}): AstroIntegration {
  const config = resolveConfig(options)
  return {
    name: 'astro-eclipse',
    hooks: {
      'astro:config:setup': ({ injectScript, updateConfig }) => {
        injectScript('head-inline', buildHeadScript(config))
        updateConfig({ vite: { plugins: [configModule(config)] } })
      },
    },
  }
}

/** Serves the resolved config to `astro-eclipse/client` as a virtual module. */
function configModule(config: EclipseConfig) {
  return {
    name: 'astro-eclipse:config',
    resolveId: (id: string) => (id === VIRTUAL_ID ? `\0${VIRTUAL_ID}` : undefined),
    load: (id: string) => (id === `\0${VIRTUAL_ID}` ? `export default ${JSON.stringify(config)}` : undefined),
  }
}
