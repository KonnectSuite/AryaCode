import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STARTER_PLUGINS } from '../src/starter-plugins.ts'

/** Directory holding the shipped seed tarballs. */
const SEED_DIR = join(import.meta.dirname, '..', 'seed')

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

  it('ships the exact validated build of every entry', () => {
    for (const plugin of STARTER_PLUGINS) {
      expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/u)
      // npm's own file name for a scoped package: the scope's `@` and `/` are
      // flattened to `-`, so `@scope/name@1.2.3` ships as `scope-name-1.2.3.tgz`.
      const fileName = `${plugin.name.replace(/^@/u, '').replace(/\//gu, '-')}-${plugin.version}.tgz`
      expect(plugin.tarball).toBe(fileName)
      // A seeded entry with no bytes, or bytes nothing checks, is the shape
      // that made the market silently unreachable before: every entry is a
      // verified tarball, first-party included.
      expect(plugin.integrity).toMatch(/^sha512-[A-Za-z0-9+/]+={0,2}$/u)
      expect(plugin.range).toContain(plugin.version)
    }
  })

  it('has a tarball on disk whose bytes match the recorded integrity', () => {
    for (const plugin of STARTER_PLUGINS) {
      const path = join(SEED_DIR, plugin.tarball)
      // A missing tarball would make an offline install impossible, and a
      // substituted one would install code nobody reviewed.
      expect(statSync(path).size).toBeGreaterThan(1024)
      const digest = createHash('sha512').update(readFileSync(path)).digest('base64')
      expect(`sha512-${digest}`).toBe(plugin.integrity)
    }
  })
})
