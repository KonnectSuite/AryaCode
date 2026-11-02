import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ensureReleaseAgePolicy, seedStarterPlugins } from '../src/seed-starter-plugins.ts'
import { STARTER_PLUGINS, type StarterPlugin } from '../src/starter-plugins.ts'

/** Directory holding the shipped seed tarballs. */
const SEED_DIR = join(import.meta.dirname, '..', 'seed')

/** The market's package name: the entry an installer must carry forward. */
const MARKET_NAME = '@aryacode/dsh-arya-market'

/** The market entry itself, resolved once so a missing entry fails loudly. */
function marketEntry(): StarterPlugin {
  const entry = STARTER_PLUGINS.find(plugin => plugin.name === MARKET_NAME)
  if (entry === undefined) throw new Error(`the starter list does not carry ${MARKET_NAME}`)
  return entry
}

const MARKET = marketEntry()

/** A version older than anything published, so it always loses the comparison. */
const OLD = '0.0.1'

type Versions = Readonly<Record<string, string>>

/** Write the pnpm stand-in: record the arguments, change nothing, succeed. */
function fakePnpm(dir: string): string {
  const path = join(dir, 'fake-pnpm.cjs')
  writeFileSync(path, 'require("node:fs").appendFileSync("calls.log", process.argv.slice(2).join(" ") + "\\n")\n')
  return path
}

/** A profile that already has every starter plugin at the given versions. */
function profileWith(versions: Versions): string {
  const dir = mkdtempSync(join(tmpdir(), 'seed-upgrade-'))
  const dependencies: Record<string, string> = {}
  for (const plugin of STARTER_PLUGINS) {
    const version = versions[plugin.name] ?? plugin.version
    const installed = join(dir, 'node_modules', plugin.name)
    mkdirSync(installed, { recursive: true })
    writeFileSync(join(installed, 'package.json'), JSON.stringify({ name: plugin.name, version }))
    dependencies[plugin.name] = version
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'seed-upgrade-profile',
    private: true,
    dependencies,
  }))
  return dir
}

/**
 * Seed one profile.
 * @param dir - profile directory.
 * @returns the report.
 */
async function seed(dir: string) {
  return await seedStarterPlugins({
    profile: 'dsh',
    dir,
    seedDir: SEED_DIR,
    node: process.execPath,
    pnpm: fakePnpm(dir),
  })
}

describe('seeding an existing profile', () => {
  it('replaces a plugin this build ships newer, so the market can carry forward', async () => {
    const dir = profileWith({ [MARKET.name]: OLD })
    const report = await seed(dir)
    // The market is part of the app; leaving an old one in place is what let an
    // installer update keep the in-use plugin update bug alive.
    expect(report.upgraded).toContain(`${MARKET.name}@${OLD}`)
    expect(report.installed).not.toContain(MARKET.name)
    expect(readFileSync(join(dir, 'calls.log'), 'utf8')).toContain(`add file:${join(SEED_DIR, MARKET.tarball)}`)
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
      dsh: { profile: { bundles: string[] } }
    }
    // The range is recorded, never the file: spec, or the market could not update it again.
    expect(manifest.dependencies[MARKET.name]).toBe(MARKET.range)
    expect(manifest.dsh.profile.bundles).toContain(MARKET.name)
  })

  it('leaves a plugin alone when the profile already has this build or newer', async () => {
    const dir = profileWith({})
    const report = await seed(dir)
    for (const plugin of STARTER_PLUGINS) {
      expect(report.present).toContain(`${plugin.name}@${plugin.version}`)
    }
    expect(report.upgraded).toEqual([])
    expect(existsSync(join(dir, 'calls.log'))).toBe(false)
  })

  it('never asks pnpm to install an unverified tarball', async () => {
    const dir = profileWith({ [MARKET.name]: OLD })
    // A corrupted seed file must stop the run before pnpm is asked to install it.
    const broken = join(dir, 'seed')
    mkdirSync(broken, { recursive: true })
    writeFileSync(join(broken, MARKET.tarball), 'not the shipped bytes')
    const report = await seedStarterPlugins({
      profile: 'dsh',
      dir,
      seedDir: broken,
      node: process.execPath,
      pnpm: fakePnpm(dir),
    })
    expect(report.failed.map(entry => entry.name)).toContain(MARKET.name)
    expect(report.failed.find(entry => entry.name === MARKET.name)?.reason).toContain('does not match its recorded integrity')
  })
})

describe('the profile release-age policy', () => {
  it('turns off the hold a profile has never stated', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seed-policy-'))
    try {
      writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\n')
      expect(ensureReleaseAgePolicy(dir)).toBe('set')
      const yaml = readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8')
      expect(yaml).toContain('minimumReleaseAge: 0')
      // Stated once, the policy must not accumulate copies on later runs.
      expect(ensureReleaseAgePolicy(dir)).toBe('present')
      expect(yaml.match(/minimumReleaseAge:/gu)).toHaveLength(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('keeps a window a person chose', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seed-policy-keep-'))
    try {
      writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nminimumReleaseAge: 2880\n')
      expect(ensureReleaseAgePolicy(dir)).toBe('present')
      expect(readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8')).toContain('minimumReleaseAge: 2880')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
