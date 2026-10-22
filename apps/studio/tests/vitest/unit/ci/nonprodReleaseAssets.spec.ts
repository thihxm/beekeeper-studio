// Covers the CI scripts that attach non-production builds to a draft release
// (.github/scripts/upload_nonprod_release_assets.js) and the filters that keep
// those builds out of every channel release-published.yml ships to.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { createRequire } from "module"
import { execFileSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

const scriptsDir = path.resolve(__dirname, "../../../../../../.github/scripts")
const load = createRequire(__filename)
const { isNonProdAsset, nonProdAssetName, pruneNonProdFiles } = load(path.join(scriptsDir, "nonprod_assets.js"))
const { mirroredAssets } = load(path.join(scriptsDir, "mirror_release_downloads.js"))
const uploadNonProdAssets = load(path.join(scriptsDir, "upload_nonprod_release_assets.js"))

const SHA = "c0ffee"

// Every file a release build produces, as the unsigned --publish never build
// names it on each runner (electron-builder keeps the spaces in "Beekeeper
// Studio" when it is not publishing), next to the name studio-publish.yml's
// signed build gives the same file on the release.
const BUILD_OUTPUTS: [string, string][] = [
  ["macos-14/Beekeeper Studio-6.2.0-arm64.dmg", "Beekeeper-Studio-6.2.0-arm64.dmg"],
  ["macos-14/Beekeeper Studio-6.2.0-arm64-mac.zip", "Beekeeper-Studio-6.2.0-arm64-mac.zip"],
  ["macos-15-intel/Beekeeper Studio-6.2.0.dmg", "Beekeeper-Studio-6.2.0.dmg"],
  ["macos-15-intel/Beekeeper Studio-6.2.0-mac.zip", "Beekeeper-Studio-6.2.0-mac.zip"],
  ["windows-2022/Beekeeper Studio Setup 6.2.0.exe", "Beekeeper-Studio-Setup-6.2.0.exe"],
  ["windows-2022/Beekeeper Studio-6.2.0-portable.exe", "Beekeeper-Studio-6.2.0-portable.exe"],
  ["ubuntu-22.04/Beekeeper Studio-6.2.0.AppImage", "Beekeeper-Studio-6.2.0.AppImage"],
  ["ubuntu-22.04/beekeeper-studio_6.2.0_amd64.deb", "beekeeper-studio_6.2.0_amd64.deb"],
  ["ubuntu-22.04/beekeeper-studio-6.2.0.x86_64.rpm", "beekeeper-studio-6.2.0.x86_64.rpm"],
  ["ubuntu-22.04/beekeeper-studio_6.2.0_amd64.snap", "beekeeper-studio_6.2.0_amd64.snap"],
  ["ubuntu-22.04/Beekeeper Studio-6.2.0-x86_64.flatpak", "Beekeeper-Studio-6.2.0-x86_64.flatpak"],
  ["ubuntu-22.04/beekeeper-studio-6.2.0.pacman", "beekeeper-studio-6.2.0.pacman"],
  ["ubuntu-22.04-arm/Beekeeper Studio-6.2.0-arm64.AppImage", "Beekeeper-Studio-6.2.0-arm64.AppImage"],
  ["ubuntu-22.04-arm/beekeeper-studio_6.2.0_arm64.deb", "beekeeper-studio_6.2.0_arm64.deb"],
  ["ubuntu-22.04-arm/beekeeper-studio-6.2.0.aarch64.rpm", "beekeeper-studio-6.2.0.aarch64.rpm"],
  ["ubuntu-22.04-arm/beekeeper-studio_6.2.0_arm64.snap", "beekeeper-studio_6.2.0_arm64.snap"],
  ["ubuntu-22.04-arm/Beekeeper Studio-6.2.0-aarch64.flatpak", "Beekeeper-Studio-6.2.0-aarch64.flatpak"],
  ["ubuntu-22.04-arm/beekeeper-studio-6.2.0-aarch64.pacman", "beekeeper-studio-6.2.0-aarch64.pacman"],
]
const PRODUCTION_ASSETS = BUILD_OUTPUTS.map(([, name]) => name)
const NONPROD_ASSETS = PRODUCTION_ASSETS.map((name) => `nonprod-${name}`)
// electron-updater metadata from the same builds; never uploaded.
const BUILD_METADATA = [
  "macos-14/latest-mac.yml",
  "macos-14/builder-debug.yml",
  "macos-15-intel/latest-mac.yml",
  "windows-2022/latest.yml",
  "ubuntu-22.04/latest-linux.yml",
  "ubuntu-22.04-arm/latest-linux-arm64.yml",
]

function touch(dir: string, name: string, content = name) {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
  fs.writeFileSync(path.join(dir, name), content)
}

// releases is what listReleases returns; a list of lists is one per call, the
// last repeating, to model a draft that shows up in the listing late.
function fakeGithub({ tagSha = SHA, releases = [] as any[], assets = [] as any[] } = {}) {
  const listings = Array.isArray(releases[0]) ? releases : [releases]
  let listing = 0
  const uploaded: any[] = []
  const deleted: number[] = []
  const rest = {
    git: {
      getRef: vi.fn(async () => {
        if (!tagSha) throw Object.assign(new Error("Not Found"), { status: 404 })
        return { data: { object: { type: "tag", sha: "tag-object" } } }
      }),
      getTag: vi.fn(async () => ({ data: { object: { type: "commit", sha: tagSha } } })),
    },
    repos: {
      listReleases: vi.fn(),
      listReleaseAssets: vi.fn(),
      createRelease: vi.fn(async (params) => ({ data: { id: 99, draft: true, tag_name: params.tag_name } })),
      deleteReleaseAsset: vi.fn(async ({ asset_id }) => { deleted.push(asset_id) }),
      uploadReleaseAsset: vi.fn(async ({ name, data }) => { uploaded.push({ name, data: data.toString() }) }),
    },
  }
  const github = {
    rest,
    paginate: vi.fn(async (method) => (
      method === rest.repos.listReleases ? listings[Math.min(listing++, listings.length - 1)] : assets
    )),
  }
  return { github, uploaded, deleted }
}

const core = { info: vi.fn(), notice: vi.fn(), setFailed: vi.fn() }
const context = { repo: { owner: "beekeeper-studio", repo: "beekeeper-studio" }, sha: SHA }
const wait = { attempts: 3, delayMs: 0 }

describe("non-production release assets", () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "nonprod-assets-"))
    vi.clearAllMocks()
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  describe("marker", () => {
    it("names assets with the nonprod- prefix and recognises only those", () => {
      expect(nonProdAssetName("dist/Beekeeper-Studio-6.2.0.dmg")).toBe("nonprod-Beekeeper-Studio-6.2.0.dmg")
      // Non-production builds keep the "Beekeeper Studio" product name.
      expect(nonProdAssetName("Beekeeper Studio Setup 6.2.0.exe")).toBe("nonprod-Beekeeper-Studio-Setup-6.2.0.exe")
      expect(isNonProdAsset("nonprod-beekeeper-studio_6.2.0_amd64.deb")).toBe(true)
      expect(isNonProdAsset("beekeeper-studio_6.2.0_amd64.deb")).toBe(false)
      expect(isNonProdAsset("Beekeeper-Studio-6.2.0-nonprod.dmg")).toBe(false)
    })
  })

  describe("release-published.yml prune step", () => {
    it("deletes every non-production format and keeps every production one", () => {
      // Every format, not just the *.deb/*.rpm/*.snap the workflow downloads,
      // so a widened --pattern cannot let one through.
      for (const name of [...PRODUCTION_ASSETS, ...NONPROD_ASSETS]) touch(dir, name)
      touch(dir, "nested/nonprod-beekeeper-studio_6.2.0_arm64.snap")

      // Runs the exact command the workflow runs.
      execFileSync("node", [path.join(scriptsDir, "nonprod_assets.js"), "prune", dir])

      const left = (fs.readdirSync(dir, { recursive: true }) as string[]).filter((f) => !fs.statSync(path.join(dir, f)).isDirectory())
      expect(left.sort()).toEqual([...PRODUCTION_ASSETS].sort())
    })

    it("returns what it pruned", () => {
      touch(dir, "nonprod-a.deb")
      expect(pruneNonProdFiles(dir)).toEqual([path.join(dir, "nonprod-a.deb")])
    })
  })

  describe("mirror_release_downloads.js", () => {
    it("never mirrors or lists a non-production asset of any format", () => {
      const assets = [...PRODUCTION_ASSETS, ...NONPROD_ASSETS, "latest-mac.yml"].map((name) => ({ name }))
      expect(mirroredAssets(assets).map((a) => a.name)).toEqual([...PRODUCTION_ASSETS, "latest-mac.yml"])
    })
  })

  describe("upload_nonprod_release_assets.js", () => {
    beforeEach(() => {
      touch(dir, "macos-14/Beekeeper Studio-6.2.0-arm64.dmg")
      touch(dir, "macos-14/latest-mac.yml")
      touch(dir, "windows-2022/Beekeeper Studio Setup 6.2.0.exe")
      touch(dir, "windows-2022/latest.yml")
    })

    it("skips builds of commits the version tag does not point at", async () => {
      const { github, uploaded } = fakeGithub({ tagSha: "older-release", releases: [{ id: 1, tag_name: "v6.2.0", draft: true }] })
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0" })
      expect(uploaded).toEqual([])
      expect(github.rest.repos.createRelease).not.toHaveBeenCalled()
    })

    it("skips when the version tag does not exist", async () => {
      const { github, uploaded } = fakeGithub({ tagSha: null })
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0" })
      expect(uploaded).toEqual([])
    })

    it("leaves a published release untouched", async () => {
      const { github, uploaded } = fakeGithub({ releases: [{ id: 1, tag_name: "v6.2.0", draft: false }] })
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0" })
      expect(uploaded).toEqual([])
    })

    it("uploads every build format under its production name with the nonprod- marker", async () => {
      for (const [file] of BUILD_OUTPUTS) touch(dir, file)
      for (const file of BUILD_METADATA) touch(dir, file)
      const { github, uploaded } = fakeGithub({ releases: [{ id: 7, tag_name: "v6.2.0", draft: true }] })
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0" })
      expect(uploaded.map((u) => u.name).sort()).toEqual([...NONPROD_ASSETS].sort())
    })

    it("waits for studio-publish.yml's draft to be listed instead of creating one", async () => {
      const { github, uploaded } = fakeGithub({ releases: [[], [], [{ id: 7, tag_name: "v6.2.0", draft: true }]] })
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0", wait })
      expect(github.rest.repos.createRelease).not.toHaveBeenCalled()
      expect(github.rest.repos.uploadReleaseAsset).toHaveBeenCalledWith(expect.objectContaining({ release_id: 7 }))
      expect(uploaded.map((u) => u.name).sort()).toEqual([
        "nonprod-Beekeeper-Studio-6.2.0-arm64.dmg",
        "nonprod-Beekeeper-Studio-Setup-6.2.0.exe",
      ])
    })

    it("fails without creating a draft when none is ever listed", async () => {
      const { github, uploaded } = fakeGithub()
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0", wait })
      expect(github.paginate).toHaveBeenCalledTimes(wait.attempts)
      expect(github.rest.repos.createRelease).not.toHaveBeenCalled()
      expect(uploaded).toEqual([])
      expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(/No draft release for v6.2.0/))
    })

    it("uploads to the oldest draft when the tag has two", async () => {
      const { github } = fakeGithub({
        releases: [
          { id: 9, tag_name: "v6.2.0", draft: true },
          { id: 7, tag_name: "v6.2.0", draft: true },
          { id: 3, tag_name: "v6.1.0", draft: true },
        ],
      })
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0", wait })
      const releaseIds = github.rest.repos.uploadReleaseAsset.mock.calls.map(([params]) => params.release_id)
      expect(releaseIds).toEqual([7, 7])
    })

    it("replaces only its own assets on a re-run, never production ones", async () => {
      const { github, deleted, uploaded } = fakeGithub({
        releases: [{ id: 7, tag_name: "v6.2.0", draft: true }],
        assets: [
          { id: 1, name: "Beekeeper-Studio-6.2.0-arm64.dmg" },
          { id: 2, name: "nonprod-Beekeeper-Studio-6.2.0-arm64.dmg" },
          { id: 3, name: "latest-mac.yml" },
        ],
      })
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0" })
      expect(github.rest.repos.createRelease).not.toHaveBeenCalled()
      expect(deleted).toEqual([2])
      expect(uploaded).toHaveLength(2)
      expect(github.rest.repos.uploadReleaseAsset).toHaveBeenCalledWith(expect.objectContaining({ release_id: 7 }))
    })

    it("refuses two artifacts that would upload under the same name", () => {
      touch(dir, "ubuntu-22.04/Beekeeper-Studio-6.2.0-arm64.dmg")
      expect(() => uploadNonProdAssets.collectAssets(dir)).toThrow(/both upload as nonprod-Beekeeper-Studio-6.2.0-arm64.dmg/)
    })
  })
})
