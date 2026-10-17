#!/usr/bin/env node
/*
 * Non-production release assets.
 *
 * studio-build-non-production.yml attaches its (unsigned) builds to the draft
 * release of the version it built, each renamed with NONPROD_PREFIX so they can
 * never collide with the signed production assets. Everything that ships a
 * release to users must skip them - release-published.yml prunes them after
 * downloading packages, and mirror_release_downloads.js filters them out.
 *
 * Usage: node nonprod_assets.js prune <dir>
 *   Deletes every non-production file under <dir> (used right after
 *   `gh release download`, whose --pattern globs cannot exclude anything).
 */

const fs = require('node:fs')
const path = require('node:path')

const NONPROD_PREFIX = 'nonprod-'

function isNonProdAsset(name) {
  return path.basename(name).startsWith(NONPROD_PREFIX)
}

// GitHub rewrites spaces in asset names to dots, so an asset uploaded as
// "Beekeeper Studio-6.2.0.dmg" could never be found by that name again. Dashes
// match the production asset names instead.
function nonProdAssetName(name) {
  return `${NONPROD_PREFIX}${path.basename(name).replace(/\s+/g, '-')}`
}

// Returns the paths it deleted.
function pruneNonProdFiles(dir) {
  const pruned = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      pruned.push(...pruneNonProdFiles(file))
    } else if (isNonProdAsset(entry.name)) {
      fs.rmSync(file)
      pruned.push(file)
    }
  }
  return pruned
}

module.exports = { NONPROD_PREFIX, isNonProdAsset, nonProdAssetName, pruneNonProdFiles }

if (require.main === module) {
  const [command, dir] = process.argv.slice(2)
  if (command !== 'prune' || !dir) {
    console.error('usage: nonprod_assets.js prune <dir>')
    process.exit(1)
  }
  for (const file of pruneNonProdFiles(dir)) {
    console.log(`Skipping non-production asset: ${file}`)
  }
}
