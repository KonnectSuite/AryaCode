/**
 * Install the plugins every AryaCode profile starts with.
 *
 * The work is done by the plugin manager's own command runner, so a seeded
 * plugin is installed exactly the way the market installs one: same pnpm call,
 * same compatibility checks, same `dsh.profile.bundles` reconciliation. There is
 * one install path in the product, not two that can drift.
 *
 * Each entry installs from the tarball shipped with the app, so a fresh install
 * needs no network and survives the package's publisher disappearing. The
 * dependency spec is then rewritten to the entry's semver range: installing a
 * `file:` spec is how the bytes get in, but recording one would pin the profile
 * to the installer forever and the market could never update it again.
 *
 * Idempotent: a plugin that is already present at any version is left exactly
 * as it is. That keeps a deliberate uninstall or downgrade intact instead of
 * resurrecting it on the next boot.
 *
 * @module seed-starter-plugins
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runPluginCommand, type PackageOperationOptions } from '@deepseek-ai/dsh-plugin-manager/operations'
import { STARTER_PLUGINS, type StarterPlugin } from './starter-plugins.ts'

/** Where a profile lives and which plugin binaries ship with the app. */
export interface SeedTarget {
  /** Profile name, as the plugin manager addresses it. */
  readonly profile: string
  /** Profile directory holding package.json and node_modules. */
  readonly dir: string
  /** Directory the seeded tarballs were copied to. */
  readonly seedDir: string
  /** Installation anchor the plugin manager resolves packages against. */
  readonly installAnchor: string
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

/** Read a plugin's name and version from a profile's node_modules, if present. */
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
 * Record the semver range in place of the `file:` spec the install wrote, so the
 * market can update the plugin later. Other dependencies are untouched.
 * @param dir - Profile directory.
 * @param name - Dependency to rewrite.
 * @param range - Semver range to record.
 */
async function recordRange(dir: string, name: string, range: string): Promise<void> {
  const manifestPath = join(dir, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    dependencies?: Record<string, string>
  }
  if (manifest.dependencies === undefined || manifest.dependencies[name] === undefined) return
  manifest.dependencies[name] = range
  const { writeFile } = await import('node:fs/promises')
  await writeFile(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`)
}

/**
 * Install every plugin the shipped set names that the profile does not already
 * have.
 *
 * @param target - Profile and seed locations.
 * @param options - Overrides for the underlying package operation.
 * @returns What was installed, what was already there, and what failed.
 */
export async function seedStarterPlugins(
  target: SeedTarget,
  options: PackageOperationOptions = { execution: 'service', outputBytes: 0, onOutput: () => {} },
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
      const tarball = verifyStarterTarball(target.seedDir, plugin)
      const result = await runPluginCommand(
        { profile: target.profile, dir: target.dir, installAnchor: target.installAnchor, cwd: target.dir },
        ['add', `file:${tarball}`],
        options,
      )
      if (result.exitCode !== 0) {
        failed.push({ name: plugin.name, reason: `install exited ${String(result.exitCode)}` })
        continue
      }
      await recordRange(target.dir, plugin.name, plugin.range)
      installed.push(plugin.name)
    } catch (error) {
      failed.push({ name: plugin.name, reason: error instanceof Error ? error.message : String(error) })
    }
  }
  return { installed, present, failed }
}
