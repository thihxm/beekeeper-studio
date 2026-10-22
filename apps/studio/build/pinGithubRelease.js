// Makes electron-builder publish into one GitHub release, picked by id.
//
// electron-builder finds the release to upload to by listing the repository's
// releases and taking the first draft whose tag matches the version. When that
// listing does not show the draft studio-publish.yml created, it creates a
// second draft, and the build legs that still see the first one, the update
// file cleanup and finalize_update_yml (which use the release id) all end up
// split across two releases. That happened in the v6.2.2 build: the first
// draft stayed out of the listing for over half an hour.
//
// studio-publish.yml passes the id of its draft as BKS_RELEASE_ID, and
// electron-builder-config.js calls this before any publisher is created, so
// every upload of every build leg goes to that release and no build ever
// creates one.
const { GitHubPublisher } = require('electron-publish')

module.exports = function pinGithubRelease(releaseId) {
  if (!/^\d+$/.test(releaseId)) {
    throw new Error(`BKS_RELEASE_ID must be a GitHub release id, got ${JSON.stringify(releaseId)}`)
  }
  // Fail the build, not the release, if an electron-builder upgrade renames
  // the method this replaces.
  if (typeof GitHubPublisher.prototype.getOrCreateRelease !== 'function') {
    throw new Error('electron-publish GitHubPublisher has no getOrCreateRelease; update build/pinGithubRelease.js')
  }

  GitHubPublisher.prototype.getOrCreateRelease = async function () {
    const release = await this.githubRequest(`/repos/${this.info.owner}/${this.info.repo}/releases/${releaseId}`, this.token)
    if (release == null) {
      throw new Error(`GitHub release ${releaseId} not found in ${this.info.owner}/${this.info.repo}`)
    }
    if (release.tag_name !== this.tag) {
      throw new Error(`GitHub release ${releaseId} is for tag ${release.tag_name}, but this build publishes ${this.tag}`)
    }
    if (!release.draft) {
      throw new Error(`GitHub release ${releaseId} (${release.tag_name}) is already published; builds only upload to a draft`)
    }
    return release
  }
}
