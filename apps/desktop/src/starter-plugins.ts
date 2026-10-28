/**
 * Plugins every AryaCode profile receives when it is created.
 *
 * This list is product data, not configuration: it is the answer to "what does
 * a fresh AryaCode install already have?", and it is the only place that
 * question is answered. Adding a plugin to the shipped set is a one-line change
 * here.
 *
 * Each entry names an exact, validated build and the tarball that carries it.
 * Shipping the tarball is deliberate: a third-party publisher could delete the
 * repository or unpublish the version at any time. With the bytes in our own
 * artifact the install no longer depends on that promise holding, and updates
 * keep working afterwards while the registry is alive. The tarball's own
 * dependencies are ordinary registry dependencies, so a first run still
 * resolves them from the pnpm store or, when one is missing there, the network;
 * only the plugin itself is guaranteed to be present.
 * `integrity` is verified before install so a substituted or corrupted tarball
 * is refused rather than executed.
 *
 * Two rules make the seeded plugin indistinguishable from one installed through
 * the market, and both are enforced by tests:
 *
 * 1. `range` is a semver range, never a `file:` or `workspace:` spec. The seed
 *    installs from the tarball, then records the range, so the market can still
 *    update the plugin afterwards. Recording the file spec would pin the
 *    profile to the installer's bytes forever - the rebuild-the-installer
 *    treadmill this project exists to escape.
 * 2. Entries are npm package names, not paths, for the same reason.
 *
 * @module starter-plugins
 */

/** One plugin that a fresh AryaCode profile starts with. */
export interface StarterPlugin {
  /** npm package name, exactly as the market would install it. */
  readonly name: string
  /** Semver range recorded in the profile, so updates stay possible. */
  readonly range: string
  /** Exact version the shipped tarball contains. */
  readonly version: string
  /** Tarball file name under the seed directory. */
  readonly tarball: string
  /** Subresource-integrity string of that tarball, verified before install. */
  readonly integrity: string
}

/** Plugins shipped pre-installed in every AryaCode profile. */
export const STARTER_PLUGINS: readonly StarterPlugin[] = [
  {
    name: '@aryacode/dsh-arya-market',
    range: '^1.70.1-arya.0.2',
    version: '1.70.1-arya.0.2',
    tarball: 'aryacode-dsh-arya-market-1.70.1-arya.0.2.tgz',
    integrity: 'sha512-nUxE/FNPUFFW56j1WT0app8Zx81bHIL9NbaXByrT+y0kGWDFFBCqz9ATtgo3VZsLiuO3LW/4367DYtu/nOHBRA==',
  },
  {
    name: '@aryacode/dsh-engineering',
    range: '^0.20.2',
    version: '0.20.2',
    tarball: 'aryacode-dsh-engineering-0.20.2.tgz',
    integrity: 'sha512-WIgVVxmHJzGou0aT1x8KhhO0pTCSFOFsSXstcv7SIK0eTCIxWOezZNKWSYSm3U6Yk0a68R4tnY2ge6dFzFrY5A==',
  },
  {
    name: 'dsh-better-sidebar',
    range: '^0.28.0',
    version: '0.28.0',
    tarball: 'dsh-better-sidebar-0.28.0.tgz',
    integrity: 'sha512-x7+/YmH/HrSlXWOBZkhL7qQqcDgZEnDcWrhR5GlizzUZjz+w84FbQ6jo8trJC9tyaQxMaNvXVnXwDxn4I330Ew==',
  },
]
