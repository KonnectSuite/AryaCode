/** Filesystem ownership for the Electron-managed desktop installation. */

import { homedir } from 'node:os'
import { join } from 'node:path'

/** Stable desktop installation paths under the shared Harness home. */
export interface DesktopPaths {
  readonly profile: string
  readonly lock: string
}

/**
 * Resolve every Electron-owned path without changing the shared data roots.
 * @param dshHome - Harness home shared with npm-installed dsh.
 * @returns immutable desktop path set.
 */
/** Environment variable that overrides AryaCode's own data home. */
export const ARYACODE_HOME_ENV = 'ARYACODE_HOME'

/**
 * Resolve the home AryaCode keeps its data in.
 *
 * Deliberately independent of `DSH_HOME`: that variable is shared with every
 * harness on the machine, including an installed AryaAI, and inheriting it would
 * put two products in one profile. AryaCode owns its own root so the other
 * instance stays intact as a fallback.
 *
 * @param env - environment mapping used to read the override.
 * @returns absolute home directory for this product.
 */
export function resolveAryaCodeHome(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env[ARYACODE_HOME_ENV]?.trim()
  if (configured !== undefined && configured !== '') return configured
  return join(homedir(), '.aryacode')
}

export function resolveDesktopPaths(dshHome: string = resolveAryaCodeHome()): DesktopPaths {
  return {
    profile: join(dshHome, 'profiles', 'desktop'),
    lock: join(dshHome, 'profiles', 'desktop', 'lock'),
  }
}
