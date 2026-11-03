import { readFileSync } from 'node:fs'

import { defineConfig } from 'blume'

const pkg = JSON.parse(readFileSync(new URL('../../packages/astro-eclipse/package.json', import.meta.url), 'utf8')) as {
  version: string
}

export default defineConfig({
  title: 'Astro Eclipse',
  description: 'Animated theme switching for Astro, built on View Transitions.',
  logo: { image: { light: '/logo.svg', dark: '/icon-dark.svg', alt: '' } },
  github: {
    owner: 'jantursky',
    repo: 'astro-eclipse',
    dir: 'apps/docs',
  },
  navigation: {
    actions: [
      { href: 'https://astro-eclipse-demo.vercel.app', label: 'Demo' },
      { href: 'https://www.npmjs.com/package/astro-eclipse', label: 'npm' },
      { href: 'https://github.com/jantursky/astro-eclipse', label: 'GitHub' },
    ],
  },
  deployment: { site: 'https://astro-eclipse-docs.vercel.app' },
  content: {
    root: 'docs',
  },
  // Light mode uses the darker accent edge so links and active states stay readable on white.
  // The pale yellow fill itself is applied in theme.css. Colors come from design/tokens.css.
  theme: {
    accent: { light: '#8a7600', dark: '#fddd05' },
    radius: 'md',
    mode: 'system',
  },
  variables: {
    version: pkg.version,
  },
})
