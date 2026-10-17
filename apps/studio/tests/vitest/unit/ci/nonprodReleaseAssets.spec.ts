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

function touch(dir: string, name: string, content = name) {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
  fs.writeFileSync(path.join(dir, name), content)
}

function fakeGithub({ tagSha = SHA, releases = [] as any[], assets = [] as any[] } = {}) {
  const uploaded: any[] = []
  const deleted: number[] = []
  const created: any[] = []
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
      createRelease: vi.fn(async (params) => {
        created.push(params)
        return { data: { id: 99, draft: true, tag_name: params.tag_name } }
      }),
      deleteReleaseAsset: vi.fn(async ({ asset_id }) => { deleted.push(asset_id) }),
      uploadReleaseAsset: vi.fn(async ({ name, data }) => { uploaded.push({ name, data: data.toString() }) }),
    },
  }
  const github = {
    rest,
    paginate: vi.fn(async (method) => (method === rest.repos.listReleases ? releases : assets)),
  }
  return { github, uploaded, deleted, created }
}

const core = { info: vi.fn(), notice: vi.fn(), setFailed: vi.fn() }
const context = { repo: { owner: "beekeeper-studio", repo: "beekeeper-studio" }, sha: SHA }

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
    it("deletes only non-production packages from a download directory", () => {
      touch(dir, "beekeeper-studio_6.2.0_amd64.deb")
      touch(dir, "beekeeper-studio-6.2.0.x86_64.rpm")
      touch(dir, "beekeeper-studio_6.2.0_arm64.snap")
      touch(dir, "nonprod-beekeeper-studio_6.2.0_amd64.deb")
      touch(dir, "nonprod-beekeeper-studio-6.2.0.x86_64.rpm")
      touch(dir, "nested/nonprod-beekeeper-studio_6.2.0_arm64.snap")

      // Runs the exact command the workflow runs.
      execFileSync("node", [path.join(scriptsDir, "nonprod_assets.js"), "prune", dir])

      const left = fs.readdirSync(dir, { recursive: true }).filter((f: string) => !fs.statSync(path.join(dir, f)).isDirectory())
      expect(left.sort()).toEqual([
        "beekeeper-studio-6.2.0.x86_64.rpm",
        "beekeeper-studio_6.2.0_amd64.deb",
        "beekeeper-studio_6.2.0_arm64.snap",
      ])
    })

    it("returns what it pruned", () => {
      touch(dir, "nonprod-a.deb")
      expect(pruneNonProdFiles(dir)).toEqual([path.join(dir, "nonprod-a.deb")])
    })
  })

  describe("mirror_release_downloads.js", () => {
    it("never mirrors or lists non-production assets", () => {
      const assets = [
        { name: "Beekeeper-Studio-6.2.0.dmg" },
        { name: "nonprod-Beekeeper-Studio-6.2.0.dmg" },
        { name: "Beekeeper-Studio-Setup-6.2.0.exe" },
        { name: "nonprod-Beekeeper-Studio-Setup-6.2.0.exe" },
      ]
      expect(mirroredAssets(assets).map((a) => a.name)).toEqual([
        "Beekeeper-Studio-6.2.0.dmg",
        "Beekeeper-Studio-Setup-6.2.0.exe",
      ])
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

    it("creates the draft release when it does not exist yet", async () => {
      const { github, created, uploaded } = fakeGithub()
      await uploadNonProdAssets({ github, context, core }, { dir, version: "6.2.0" })
      expect(created).toEqual([expect.objectContaining({ tag_name: "v6.2.0", draft: true, generate_release_notes: true })])
      expect(uploaded.map((u) => u.name).sort()).toEqual([
        "nonprod-Beekeeper-Studio-6.2.0-arm64.dmg",
        "nonprod-Beekeeper-Studio-Setup-6.2.0.exe",
      ])
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
