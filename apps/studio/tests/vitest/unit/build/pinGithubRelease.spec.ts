import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRequire } from "module";

// Loaded the way electron-builder-config.js loads it, against the real
// electron-publish, so an electron-builder upgrade that changes how
// GitHubPublisher finds its release fails here, not in a release build.
const load = createRequire(import.meta.url);
const pinGithubRelease = load("../../../../build/pinGithubRelease.js");
const { GitHubPublisher } = load("electron-publish");
const originalGetOrCreateRelease = GitHubPublisher.prototype.getOrCreateRelease;

const RELEASE_ID = "420939861";
const DRAFT = { id: Number(RELEASE_ID), tag_name: "v6.2.3", name: "v6.2.3", draft: true };

function publisher(version = "6.2.3") {
  const pub = new GitHubPublisher(
    { cancellationToken: null, progress: null },
    { provider: "github", owner: "thihxm", repo: "beekeeper-studio", token: "token" },
    version,
    { publish: "always" },
  );
  pub.githubRequest = vi.fn(async () => DRAFT);
  pub.createRelease = vi.fn();
  return pub;
}

describe("pinGithubRelease", () => {
  beforeEach(() => {
    pinGithubRelease(RELEASE_ID);
  });

  afterEach(() => {
    GitHubPublisher.prototype.getOrCreateRelease = originalGetOrCreateRelease;
  });

  it("uploads every artifact to the pinned release, fetched by id", async () => {
    const pub = publisher();
    // _release is what doUpload awaits before every upload.
    await expect(pub._release.value).resolves.toBe(DRAFT);
    expect(pub.githubRequest).toHaveBeenCalledTimes(1);
    expect(pub.githubRequest).toHaveBeenCalledWith(`/repos/thihxm/beekeeper-studio/releases/${RELEASE_ID}`, "token");
  });

  it("never lists releases or creates one, even when the release is missing", async () => {
    const pub = publisher();
    pub.githubRequest.mockRejectedValue(Object.assign(new Error("Not Found"), { statusCode: 404 }));
    await expect(pub._release.value).rejects.toThrow("Not Found");
    expect(pub.githubRequest).not.toHaveBeenCalledWith(`/repos/thihxm/beekeeper-studio/releases`, "token");
    expect(pub.createRelease).not.toHaveBeenCalled();
  });

  it("refuses a release for another tag", async () => {
    await expect(publisher("6.2.4").getOrCreateRelease()).rejects.toThrow(/is for tag v6.2.3, but this build publishes v6.2.4/);
  });

  it("refuses a published release", async () => {
    const pub = publisher();
    pub.githubRequest.mockResolvedValue({ ...DRAFT, draft: false });
    await expect(pub.getOrCreateRelease()).rejects.toThrow(/already published/);
  });

  it("refuses anything but a release id", () => {
    expect(() => pinGithubRelease("v6.2.3")).toThrow(/must be a GitHub release id/);
    expect(() => pinGithubRelease("")).toThrow(/must be a GitHub release id/);
  });
});

describe("electron-builder-config.js", () => {
  const configPath = load.resolve("../../../../electron-builder-config.js");

  afterEach(() => {
    delete process.env.BKS_RELEASE_ID;
    delete load.cache[configPath];
    GitHubPublisher.prototype.getOrCreateRelease = originalGetOrCreateRelease;
  });

  it("pins the release when BKS_RELEASE_ID is set", () => {
    process.env.BKS_RELEASE_ID = RELEASE_ID;
    load(configPath);
    expect(GitHubPublisher.prototype.getOrCreateRelease).not.toBe(originalGetOrCreateRelease);
  });

  it("fails when BKS_RELEASE_ID is set but empty", () => {
    process.env.BKS_RELEASE_ID = "";
    expect(() => load(configPath)).toThrow(/must be a GitHub release id/);
    expect(GitHubPublisher.prototype.getOrCreateRelease).toBe(originalGetOrCreateRelease);
  });

  it("leaves electron-builder's lookup alone when BKS_RELEASE_ID is not set", () => {
    load(configPath);
    expect(GitHubPublisher.prototype.getOrCreateRelease).toBe(originalGetOrCreateRelease);
  });
});
