import { describe, expect, it } from 'vitest'
import { STARTER_PLUGINS } from '../src/starter-plugins.ts'

describe('starter plugin list', () => {
  it('names at least one plugin, each once', () => {
    expect(STARTER_PLUGINS.length).toBeGreaterThan(0)
    const names = STARTER_PLUGINS.map(plugin => plugin.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('uses npm package names, not paths', () => {
    for (const plugin of STARTER_PLUGINS) {
      expect(plugin.name).toMatch(/^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/u)
      expect(plugin.name).not.toContain('\\')
      expect(plugin.name).not.toContain('/./')
    }
  })

  it('records semver ranges so the market can still update seeded plugins', () => {
    for (const plugin of STARTER_PLUGINS) {
      // A file:, link:, workspace: or git spec would freeze the plugin at the
      // bytes shipped in the installer and make updates impossible.
      expect(plugin.range).not.toMatch(/^(?:file|link|workspace|git|https?):/u)
      expect(plugin.range).toMatch(/\d+\.\d+\.\d+/u)
    }
  })
})
