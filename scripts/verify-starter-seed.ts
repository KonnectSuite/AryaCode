/**
 * Scratch-profile check for the starter seed. Creates a throwaway profile,
 * seeds it, and asserts the three properties that matter: the plugin installs,
 * the dependency spec becomes a range, and a second run does nothing.
 */
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initProfile } from '@deepseek-ai/dsh-app-boot'
import { PROFILE_TEMPLATES } from '@deepseek-ai/dsh-official-bundles'
import { STARTER_PLUGINS } from '../apps/desktop/src/starter-plugins.ts'
import { seedStarterPlugins } from '../apps/desktop/src/seed-starter-plugins.ts'

const root = mkdtempSync(join(tmpdir(), 'arya-seed-'))
const dir = join(root, 'profiles', 'scratch')
const webTemplate = PROFILE_TEMPLATES.web
if (webTemplate === undefined) throw new Error('verify-starter-seed: the web profile template is missing')
initProfile(dir, webTemplate.bundles)

const seedDir = join(import.meta.dirname, '..', 'apps', 'desktop', 'seed')
// The seed spawns pnpm through the node binary it is handed, so it needs pnpm's CLI file rather
// than a command name that only a shell would resolve.
const pnpm = join(import.meta.dirname, '..', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
if (!existsSync(pnpm)) throw new Error(`verify-starter-seed: the repository pnpm is missing at ${pnpm}`)
const target = { profile: 'scratch', dir, seedDir, node: process.execPath, pnpm }

const first = await seedStarterPlugins(target)
console.log('FIRST :', JSON.stringify(first))

const manifestAfter = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}
const spec = manifestAfter.dependencies?.['dsh-better-sidebar']
const bundles = manifestAfter.dsh?.profile?.bundles ?? []

const second = await seedStarterPlugins(target)
console.log('SECOND:', JSON.stringify(second))

const checks = {
  'installed on first run': first.installed.includes('dsh-better-sidebar'),
  'no failures': first.failed.length === 0,
  'package on disk': existsSync(join(dir, 'node_modules', 'dsh-better-sidebar', 'package.json')),
  'spec is a range, not file:': spec === '^0.28.2',
  'bundle row appended': bundles.includes('dsh-better-sidebar'),
  'second run is a no-op': second.installed.length === 0 && second.present.length === STARTER_PLUGINS.length,
}
for (const [name, ok] of Object.entries(checks)) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`)
const failed = Object.values(checks).some(ok => !ok)
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS')
process.exit(failed ? 1 : 0)
