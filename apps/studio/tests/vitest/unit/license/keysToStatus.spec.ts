import { describe, it, expect, afterEach } from "vitest";
import { keysToStatus, LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from "@/common/platform_info";

const DAY = 24 * 60 * 60 * 1000;
const yesterday = () => new Date(Date.now() - DAY);
const tomorrow = () => new Date(Date.now() + DAY);

function license(options: {
  validUntil: Date;
  supportUntil: Date;
  licenseType?: LicenseKey["licenseType"];
  maxAllowedAppRelease?: { tagName: string } | null;
}): LicenseKey {
  const key = new LicenseKey();
  key.email = "fake-email";
  key.key = "fake-key";
  key.validUntil = options.validUntil;
  key.supportUntil = options.supportUntil;
  key.licenseType = options.licenseType ?? "PersonalLicense";
  key.maxAllowedAppRelease = options.maxAllowedAppRelease ?? null;
  return key;
}

describe("keysToStatus", () => {
  const originalAppVersion = platformInfo.parsedAppVersion;

  afterEach(() => {
    platformInfo.parsedAppVersion = originalAppVersion;
  });

  it("no license", () => {
    const status = keysToStatus([]);
    expect(status.edition).toBe("ultimate");
    expect(status.canAccessCloudWorkspaces).toBe(false);
  });

  it("expired validUntil is still ultimate", () => {
    const status = keysToStatus([
      license({ validUntil: yesterday(), supportUntil: yesterday() }),
    ]);
    expect(status.edition).toBe("ultimate");
  });

  it("old maxAllowedAppRelease is still ultimate", () => {
    // test mode reports 0.0.0; make the app clearly newer than v0.0.1
    platformInfo.parsedAppVersion = { ...originalAppVersion, major: 5, minor: 0, patch: 0 };
    const status = keysToStatus([
      license({
        validUntil: tomorrow(),
        supportUntil: tomorrow(),
        maxAllowedAppRelease: { tagName: "v0.0.1" },
      }),
    ]);
    expect(status.edition).toBe("ultimate");
  });

  it("active subscription grants cloud", () => {
    const status = keysToStatus([
      license({ validUntil: tomorrow(), supportUntil: tomorrow() }),
    ]);
    expect(status.canAccessCloudWorkspaces).toBe(true);
  });

  it("expired support denies cloud", () => {
    const status = keysToStatus([
      license({ validUntil: tomorrow(), supportUntil: yesterday() }),
    ]);
    expect(status.canAccessCloudWorkspaces).toBe(false);
  });

  it("expired validUntil denies cloud", () => {
    const status = keysToStatus([
      license({ validUntil: yesterday(), supportUntil: tomorrow() }),
    ]);
    expect(status.canAccessCloudWorkspaces).toBe(false);
  });

  it("active trial row still grants cloud", () => {
    const status = keysToStatus([
      license({
        validUntil: tomorrow(),
        supportUntil: tomorrow(),
        licenseType: "TrialLicense",
      }),
    ]);
    expect(status.canAccessCloudWorkspaces).toBe(true);
  });

  it("canAccessCloudWorkspaces is an own property (survives structured clone)", () => {
    const status = keysToStatus([
      license({ validUntil: tomorrow(), supportUntil: tomorrow() }),
    ]);
    expect(structuredClone({ ...status }).canAccessCloudWorkspaces).toBe(true);
  });
});
