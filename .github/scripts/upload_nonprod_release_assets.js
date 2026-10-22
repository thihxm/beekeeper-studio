/*
 * Attach the non-production build artifacts to the draft release of the
 * version they were built from. Called from studio-build-non-production.yml via
 * actions/github-script.
 *
 * - Only runs for the commit the version tag (v<package.json version>) points
 *   at, so ordinary master pushes never touch an older release.
 * - Uploads to the tag's draft release, which studio-publish.yml creates when
 *   the tag is pushed. It never creates one: a second draft for the same tag
 *   splits the release (v6.2.2), so it waits for that draft to be listed.
 *   Published releases are left alone.
 * - Every asset is uploaded as nonprod-<original name>, and only those names
 *   are ever replaced, so re-runs are idempotent and production assets are
 *   never overwritten.
 * - electron-updater metadata (*.yml) is skipped: it describes the production
 *   file names and is useless next to renamed files.
 */

const fs = require('node:fs')
const path = require('node:path')
const { nonProdAssetName } = require('./nonprod_assets.js')

const SKIPPED_EXTENSIONS = ['.yml', '.yaml', '.blockmap']

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? listFiles(file) : [file]
  })
}

// Maps asset name -> local file, refusing duplicate names across artifacts.
function collectAssets(dir) {
  const assets = new Map()
  for (const file of listFiles(dir)) {
    if (SKIPPED_EXTENSIONS.includes(path.extname(file))) continue
    const name = nonProdAssetName(file)
    if (assets.has(name)) {
      throw new Error(`Two artifacts would both upload as ${name}: ${assets.get(name)} and ${file}`)
    }
    assets.set(name, file)
  }
  return assets
}

// The commit sha a tag points at, or null when the tag does not exist.
async function tagCommit(github, owner, repo, tag) {
  let ref
  try {
    ({ data: ref } = await github.rest.git.getRef({ owner, repo, ref: `tags/${tag}` }))
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
  let object = ref.object
  // Annotated tags point at a tag object, which in turn points at the commit.
  while (object.type === 'tag') {
    ({ data: { object } } = await github.rest.git.getTag({ owner, repo, tag_sha: object.sha }))
  }
  return object.sha
}

async function findRelease(github, owner, repo, tag) {
  // getReleaseByTag never returns drafts, so search the full list instead.
  const releases = await github.paginate(github.rest.repos.listReleases, { owner, repo, per_page: 100 })
  const matches = releases.filter((release) => release.tag_name === tag)
  // softprops/action-gh-release, which creates studio-publish.yml's draft,
  // settles on the same one: a published release, else the oldest draft.
  return matches.find((release) => !release.draft)
    || matches.sort((a, b) => a.id - b.id)[0]
    || null
}

// A new draft can take a while to show up in the release list.
async function waitForRelease(github, owner, repo, tag, { attempts, delayMs }, core) {
  for (let attempt = 1; ; attempt++) {
    const release = await findRelease(github, owner, repo, tag)
    if (release || attempt >= attempts) return release
    core.info(`No release for ${tag} listed yet, checking again in ${delayMs / 1000}s (${attempt}/${attempts})`)
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

module.exports = async ({ github, context, core }, { dir, version, wait = { attempts: 30, delayMs: 30000 } }) => {
  const { owner, repo } = context.repo
  const tag = `v${version}`

  const assets = collectAssets(dir)
  if (assets.size === 0) {
    core.setFailed(`No build artifacts found under ${dir}`)
    return
  }

  const tagSha = await tagCommit(github, owner, repo, tag)
  if (tagSha !== context.sha) {
    core.notice(tagSha
      ? `${tag} points at ${tagSha}, not ${context.sha}; this build is not a release build, nothing to attach.`
      : `${tag} does not exist; this build is not a release build, nothing to attach.`)
    return
  }

  const release = await waitForRelease(github, owner, repo, tag, wait, core)
  if (!release) {
    core.setFailed(`No draft release for ${tag}. studio-publish.yml creates it when the tag is pushed; re-run this job once it is listed.`)
    return
  }
  if (!release.draft) {
    core.notice(`${tag} is already published; leaving its assets untouched.`)
    return
  }
  core.info(`Uploading to draft release ${tag} (${release.id})`)

  const existing = await github.paginate(github.rest.repos.listReleaseAssets, {
    owner, repo, release_id: release.id, per_page: 100,
  })
  for (const [name, file] of assets) {
    // Only ever replaces an asset with the same nonprod- name: our own upload
    // from an earlier run.
    const previous = existing.find((asset) => asset.name === name)
    if (previous) {
      await github.rest.repos.deleteReleaseAsset({ owner, repo, asset_id: previous.id })
      core.info(`Replacing ${name}`)
    }
    const data = fs.readFileSync(file)
    await github.rest.repos.uploadReleaseAsset({
      owner, repo, release_id: release.id, name, data,
      headers: { 'content-type': 'application/octet-stream', 'content-length': data.length },
    })
    core.info(`Uploaded ${name}`)
  }
}

module.exports.collectAssets = collectAssets
