import { describe, expect, it, vi } from 'vitest'

import eclipse from '../src/index.js'

function setup(options?: Parameters<typeof eclipse>[0]) {
  const injectScript = vi.fn()
  const updateConfig = vi.fn()
  const hook = eclipse(options).hooks['astro:config:setup']!
  void hook({ injectScript, updateConfig } as unknown as Parameters<typeof hook>[0])
  const plugin = (updateConfig.mock.calls[0]![0] as { vite: { plugins: Record<string, (id: string) => unknown>[] } })
    .vite.plugins[0]!
  return { injectScript, plugin }
}

describe('eclipse integration', () => {
  it('is named so Astro can report it', () => {
    expect(eclipse().name).toBe('astro-eclipse')
  })

  it('injects the head script inline', () => {
    const { injectScript } = setup({ storageKey: 'my-theme' })
    expect(injectScript).toHaveBeenCalledWith('head-inline', expect.stringContaining('"k":"my-theme"'))
  })

  it('serves the resolved config as a virtual module', () => {
    const { plugin } = setup({ themes: ['light', 'dark', 'sepia'], duration: 300 })
    const id = plugin.resolveId!('virtual:astro-eclipse/config') as string
    expect(id).toBe('\0virtual:astro-eclipse/config')
    const source = plugin.load!(id) as string
    expect(JSON.parse(source.replace('export default ', ''))).toMatchObject({
      themes: ['light', 'dark', 'sepia'],
      duration: 300,
      transition: 'circle',
    })
  })

  it('leaves other modules alone', () => {
    const { plugin } = setup()
    expect(plugin.resolveId!('some-other-module')).toBeUndefined()
    expect(plugin.load!('some-other-module')).toBeUndefined()
  })

  it('fails the build for an invalid config', () => {
    expect(() => eclipse({ themes: [] })).toThrow(/at least one/)
  })
})
