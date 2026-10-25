/**
 * Plugins every AryaCode profile receives when it is created.
 *
 * This list is product data, not configuration: it is the answer to "what does
 * a fresh AryaCode install already have?", and it is the only place that
 * question is answered. Adding a plugin to the shipped set is a one-line change
 * here.
 *
 * The seeding step that consumes this list installs each entry into the
 * profile and appends it to `dsh.profile.bundles`. Two rules make that
 * survivable long-term, and both are enforced by tests:
 *
 * 1. `range` is a semver range, never a `file:` or `workspace:` spec. A file
 *    spec would pin the profile to bytes inside the installer and make the
 *    market unable to ever update the plugin again - exactly the rebuild-the-
 *    installer treadmill this project exists to escape.
 * 2. Entries are npm packages, not paths. The seed installs them the same way
 *    the plugin market does, so a seeded plugin and a hand-installed one are
 *    indistinguishable afterwards.
 *
 * Offline installation is deliberately not modelled here: it ships the same
 * packages from a local cache instead of npm, and is a property of the release
 * artifact rather than of this list.
 *
 * @module starter-plugins
 */

/** One plugin that a fresh AryaCode profile starts with. */
export interface StarterPlugin {
  /** npm package name, exactly as the market would install it. */
  readonly name: string
  /** Semver range recorded in the profile, so updates stay possible. */
  readonly range: string
}

/** Plugins shipped pre-installed in every AryaCode profile. */
export const STARTER_PLUGINS: readonly StarterPlugin[] = [
  { name: 'dsh-better-sidebar', range: '^0.28.0' },
]
