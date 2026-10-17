// Covers how the release workflows behave in a repository that lacks the
// upstream signing/publishing accounts: .github/scripts/check_credentials.sh
// gates those steps, and notify_slack.sh skips an unconfigured webhook.
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { spawnSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

const scriptsDir = path.resolve(__dirname, "../../../../../../.github/scripts")

function runScript(script: string, args: string[], env: Record<string, string>) {
  return spawnSync("bash", [path.join(scriptsDir, script), ...args], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, GITHUB_REPOSITORY: "fork/beekeeper-studio", ...env },
  })
}

describe("check_credentials.sh", () => {
  let outputFile: string

  beforeEach(() => {
    outputFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "check-credentials-")), "output")
    fs.writeFileSync(outputFile, "")
  })

  afterEach(() => {
    fs.rmSync(path.dirname(outputFile), { recursive: true, force: true })
  })

  const check = (env: Record<string, string>) =>
    runScript("check_credentials.sh", ["signing", "key", "password"], { GITHUB_OUTPUT: outputFile, ...env })

  it("reports the credentials available when every secret is set", () => {
    const result = check({ key: "k", password: "p" })
    expect(result.status).toBe(0)
    expect(fs.readFileSync(outputFile, "utf8")).toBe("available=true\n")
    expect(result.stdout).not.toContain("::warning::")
  })

  it("skips with a warning naming the secrets when none are set", () => {
    const result = check({})
    expect(result.status).toBe(0)
    expect(fs.readFileSync(outputFile, "utf8")).toBe("available=false\n")
    expect(result.stdout).toContain("::warning::Skipping signing: secrets not configured in fork/beekeeper-studio (key password)")
  })

  it("fails when only some secrets are set", () => {
    const result = check({ key: "k" })
    expect(result.status).toBe(1)
    expect(fs.readFileSync(outputFile, "utf8")).toBe("")
    expect(result.stdout).toContain("::error::signing is partially configured; missing secrets: password")
  })
})

describe("notify_slack.sh", () => {
  it("skips with a warning when the webhook secret is not configured", () => {
    const result = runScript("notify_slack.sh", ["hello"], { SLACK_WEBHOOK: "" })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("::warning::Skipping Slack notification")
  })
})

describe("mirror_release_downloads.js", () => {
  it("requires the repository to mirror from", () => {
    const result = spawnSync("node", [path.join(scriptsDir, "mirror_release_downloads.js"), "v6.2.0"], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        GH_TOKEN: "t",
        R2_BUCKET: "b",
        R2_ENDPOINT: "e",
        PUBLIC_BASE_URL: "u",
        LATEST_TAG: "v6.2.0",
      },
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("missing required env: GITHUB_REPOSITORY")
  })
})
