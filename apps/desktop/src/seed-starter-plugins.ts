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
 * Idempotent: an existing install at any version is left alone, so a deliberate
 * uninstall or downgrade survives the next boot.
 *
 * @module seed-starter-plugins
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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
  /** Plugin names that could not be installed, with the reason. */
  readonly failed: readonly { readonly name: string; readonly reason: string }[]
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
  const installed: string[] = []
  const present: string[] = []
  const failed: { name: string; reason: string }[] = []
  for (const plugin of STARTER_PLUGINS) {
    const existing = installedVersion(target.dir, plugin.name)
    if (existing !== undefined) {
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
      installed.push(plugin.name)
    } catch (error) {
      failed.push({ name: plugin.name, reason: error instanceof Error ? error.message : String(error) })
    }
  }
  return { installed, present, failed }
}
