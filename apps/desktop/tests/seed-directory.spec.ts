import { describe, expect, it } from 'vitest'
import { join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { seedDirectory } from '../src/seed-starter-plugins.ts'

/** Build the `import.meta.url` of a module at the given path segments. */
function moduleUrl(...segments: readonly string[]): string {
  return pathToFileURL(join(...segments)).href
}

describe('seed directory', () => {
  it('reads the tarballs from beside the archive when the app is packaged', () => {
    const directory = seedDirectory(moduleUrl('build', 'resources', 'app.asar', 'lib', 'main.js'))
    // A separate pnpm process cannot open a path inside app.asar, so the seed
    // must resolve to the unpacked copy next to it.
    expect(directory).toContain(`${sep}app.asar.unpacked${sep}`)
    expect(directory.endsWith(join('app.asar.unpacked', 'seed') + sep)).toBe(true)
  })

  it('keeps the sibling seed directory in a build tree', () => {
    const directory = seedDirectory(moduleUrl('build', 'out', 'lib', 'main.js'))
    expect(directory).not.toContain('app.asar')
    expect(directory.endsWith(join('out', 'seed') + sep)).toBe(true)
  })
})
