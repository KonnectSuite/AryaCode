/**
 * Install the plugins every AryaCode profile starts with.
 *
 * Deliberately self-sufficient: it runs the packaged runtime's own pnpm against
 * the profile and edits the profile manifest itself. An earlier version called
 * the plugin manager, which loads unbundled from the application archive where
 * its dependencies are not resolvable, so seeding failed inside the packaged
 * application while working in a dev checkout.
 *
 * Two rules keep the result updatable, and tests enforce them:
 *
 * 1. Entries that ship a tarball install from those bytes, so a first run needs
 *    no network and survives the package's publisher disappearing.
 * 2. The dependency is recorded as a semver range afterwards. Recording the
 *    `file:` spec would pin the profile to the installer's bytes forever and the
 *    market could never update it - the treadmill this project exists to escape.
 *
 * Idempotent, but not frozen: a plugin the profile already has is left alone
 * unless this build ships a newer one, in which case the newer one replaces it.
 * That is what carries the market itself forward - the market is part of the app,
 * and a profile seeded before a market fix would otherwise keep the old market
 * forever, which is how an installer "update" could still leave the in-use
 * plugin update bug in place.
 *
 * @module seed-starter-plugins
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gt, valid } from 'semver'
import { STARTER_PLUGINS, type StarterPlugin } from './starter-plugins.ts'

/** Where a profile lives, plus the runtimes used to install into it. */
export interface SeedTarget {
  /** Profile name, as the plugin manager addresses it. */
  readonly profile: string
  /** Profile directory holding package.json and node_modules. */
  readonly dir: string
  /** Directory the seeded tarballs were copied to. */
  readonly seedDir: string
  /** Node executable of the packaged runtime. */
  readonly node: string
  /** pnpm entry script of the packaged runtime. */
  readonly pnpm: string
}

/** What a seed run did, for logging and tests. */
export interface SeedReport {
  /** Plugin names installed by this run. */
  readonly installed: readonly string[]
  /** Plugin names already present, left untouched. */
  readonly present: readonly string[]
  /** Plugin names the shipped build was newer than, replaced in place. */
  readonly upgraded: readonly string[]
  /** Plugin names that could not be installed, with the reason. */
  readonly failed: readonly { readonly name: string; readonly reason: string }[]
}

/**
 * Whether a profile's copy is older than the one this build ships.
 *
 * A profile that already has a plugin is not automatically up to date: the
 * market is part of the app, and a profile seeded by an older installer keeps
 * that installer's market forever unless the seed is allowed to replace it. The
 * market is where plugin-update bugs get fixed, so a newer one must win.
 * @param existing - Version found in the profile's node_modules.
 * @param shipped - Version this build ships in the seed directory.
 * @returns true when the shipped one is newer, false when equal, newer, or unknown.
 */
function isOlder(existing: string, shipped: string): boolean {
  const before = valid(existing)
  const after = valid(shipped)
  if (before === null || after === null) return false
  return gt(after, before)
}


/**
 * Turn off pnpm's fresh-release hold in a profile the seed owns.
 *
 * pnpm 11.28 enforces `minimumReleaseAge` by default — 24 hours — and it
 * verifies the WHOLE lockfile on every install. Every plugin this product
 * publishes is younger than that, so a profile that has installed one can no
 * longer install anything: the market's Update button fails with
 * `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` naming a version it did not even
 * ask for. The one-shot bypass (`--config.minimumReleaseAge=0`) exists, but the
 * official desktop host runs pnpm itself and takes no options from a plugin, so
 * it is unreachable from the surface that performs updates.
 *
 * Seeding a profile therefore sets the same policy permanently, in the file
 * pnpm reads it from. This is a deliberate product decision, not a workaround:
 * the Arya catalog pins a sha256 per release and the market verifies it before
 * installing, which is the protection this hold approximates. A profile that
 * already states a value keeps it — a person who chose a window is not overruled.
 *
 * @param dir - Profile directory.
 * @returns 'set' when this call wrote the policy, 'present' when one already existed.
 */
export function ensureReleaseAgePolicy(dir: string): 'set' | 'present' {
  const file = join(dir, 'pnpm-workspace.yaml')
  const header = '# Written by AryaCode: pnpm defaults to a 24-hour minimumReleaseAge, which\n'
    + '# refuses every AryaCode plugin release until it ages out. Releases are\n'
    + '# sha256-pinned by the plugin catalog, so the hold is redundant here.\n'
  let yaml = ''
  if (existsSync(file)) {
    yaml = readFileSync(file, 'utf8')
    if (/^minimumReleaseAge:/mu.test(yaml)) return 'present'
  }
  const eol = yaml.includes('\r\n') ? '\r\n' : '\n'
  const line = `minimumReleaseAge: 0${eol}`
  // Keep the key above the exclude list when one exists, so the two read together.
  if (/^minimumReleaseAgeExclude:/mu.test(yaml)) {
    yaml = yaml.replace(/^minimumReleaseAgeExclude:/mu, line + 'minimumReleaseAgeExclude:')
  } else if (yaml === '') {
    yaml = `packages:${eol}  - .${eol}${eol}${header}${line}`
  } else {
    yaml = yaml.replace(/\n$/, '') + eol + header + line
  }
  writeFileSync(file, yaml)
  return 'set'
}

/** Read a plugin's version from a profile's node_modules, if present. */
function installedVersion(dir: string, name: string): string | undefined {
  const manifest = join(dir, 'node_modules', name, 'package.json')
  if (!existsSync(manifest)) return undefined
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'))
    const version = (parsed as { version?: unknown }).version
    return typeof version === 'string' ? version : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Refuse a tarball whose bytes are not the ones this build shipped.
 * @param seedDir - Directory holding the seeded tarballs.
 * @param plugin - Entry describing the expected bytes.
 * @throws When the file is missing or its digest differs.
 */
export function verifyStarterTarball(seedDir: string, plugin: StarterPlugin): string {
  const path = join(seedDir, plugin.tarball)
  if (!existsSync(path)) {
    throw new Error(`${plugin.name}: seed tarball ${plugin.tarball} is missing`)
  }
  const digest = `sha512-${createHash('sha512').update(readFileSync(path)).digest('base64')}`
  if (digest !== plugin.integrity) {
    throw new Error(`${plugin.name}: seed tarball ${plugin.tarball} does not match its recorded integrity`)
  }
  return path
}

/**
 * Directory that holds the seeded tarballs for the loading module.
 *
 * The tarballs are packaged inside the application archive, and a separate pnpm
 * process cannot open a path inside `app.asar`, so the unpacked copy beside it
 * is the one to read. A build tree has no archive and resolves to its sibling
 * `seed` directory either way.
 * @param moduleUrl - `import.meta.url` of the module that resolves the seed.
 * @returns Absolute directory containing the seeded tarballs.
 */
export function seedDirectory(moduleUrl: string): string {
  const directory = fileURLToPath(new URL('../seed/', moduleUrl))
  const archive = `${sep}app.asar${sep}`
  return directory.includes(archive) ? directory.replace(archive, `${sep}app.asar.unpacked${sep}`) : directory
}

/** Shape of the fields this module edits in a profile manifest. */
interface ProfileManifest {
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

/**
 * Record the entry the way a market install leaves it: the semver range in the
 * dependency, and the package named in the profile's bundle stack.
 * @param dir - Profile directory.
 * @param name - Package name.
 * @param range - Semver range to record.
 */
async function recordInstall(dir: string, name: string, range: string): Promise<void> {
  const path = join(dir, 'package.json')
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as ProfileManifest
  manifest.dependencies ??= {}
  manifest.dependencies[name] = range
  manifest.dsh ??= {}
  manifest.dsh.profile ??= {}
  const bundles = manifest.dsh.profile.bundles ?? []
  if (!bundles.includes(name)) bundles.push(name)
  manifest.dsh.profile.bundles = bundles
  await writeFile(path, `${JSON.stringify(manifest, undefined, 2)}\n`)
}

/**
 * Install every plugin the shipped set names that the profile does not already
 * have.
 *
 * @param target - Profile, seed and runtime locations.
 * @param onOutput - Receives package-manager output for diagnostics.
 * @returns What was installed, what was already there, and what failed.
 */
export async function seedStarterPlugins(
  target: SeedTarget,
  onOutput: (text: string) => void = () => {},
): Promise<SeedReport> {
  // Before any install: the profile must be able to accept a fresh release.
  ensureReleaseAgePolicy(target.dir)
  const installed: string[] = []
  const present: string[] = []
  const upgraded: string[] = []
  const failed: { name: string; reason: string }[] = []
  for (const plugin of STARTER_PLUGINS) {
    const existing = installedVersion(target.dir, plugin.name)
    if (existing !== undefined && !isOlder(existing, plugin.version)) {
      present.push(`${plugin.name}@${existing}`)
      continue
    }
    try {
      const spec = plugin.tarball === ''
        ? `${plugin.name}@${plugin.version}`
        : `file:${verifyStarterTarball(target.seedDir, plugin)}`
      const run = spawnSync(target.node, [target.pnpm, 'add', spec, '--prefer-offline'], {
        cwd: target.dir,
        encoding: 'utf8',
        // The packaged node here is the Electron binary; without this it opens a window.
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        windowsHide: true,
      })
      onOutput(`${run.stdout ?? ''}${run.stderr ?? ''}`)
      if (run.status !== 0) {
        failed.push({ name: plugin.name, reason: `pnpm exited ${String(run.status)}` })
        continue
      }
      await recordInstall(target.dir, plugin.name, plugin.range)
      if (existing === undefined) installed.push(plugin.name)
      else upgraded.push(`${plugin.name}@${existing}`)
    } catch (error) {
      failed.push({ name: plugin.name, reason: error instanceof Error ? error.message : String(error) })
    }
  }
  return { installed, present, upgraded, failed }
}
