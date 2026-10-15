import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { LicenseHandlers } from "@/handlers/licenseHandlers";
import { OfflineLicense } from "@/backend/lib/OfflineLicense";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";

const DAY = 24 * 60 * 60 * 1000;

/** A signature-verified offline license file, without touching the disk. */
function activeOfflineLicense(): OfflineLicense {
  const offline = Object.create(OfflineLicense.prototype) as OfflineLicense;
  offline.isValid = true;
  offline.path = "/fake/license.json";
  offline.payload = {
    license_key: {
      email: "offline@example.com",
      key: "offline-key",
      valid_until: new Date(Date.now() + DAY).toISOString(),
      support_until: new Date(Date.now() + DAY).toISOString(),
      license_type: "BusinessLicense",
      max_allowed_app_release: null,
    },
  };
  return offline;
}

async function saveLicense(options: {
  validUntil: Date;
  supportUntil: Date;
  licenseType?: LicenseKey["licenseType"];
}) {
  const license = new LicenseKey();
  license.email = "fake-email";
  license.key = "fake-key";
  license.validUntil = options.validUntil;
  license.supportUntil = options.supportUntil;
  license.licenseType = options.licenseType ?? "PersonalLicense";
  license.maxAllowedAppRelease = null;
  return await license.save();
}

describe("LicenseHandlers", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
    await LicenseKey.clear();
    vi.spyOn(OfflineLicense, "load").mockReturnValue(null);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await TestOrmConnection.disconnect();
  });

  describe("license/getStatus", () => {
    it("offline license grants cloud", async () => {
      vi.spyOn(OfflineLicense, "load").mockReturnValue(activeOfflineLicense());

      const status = await LicenseHandlers["license/getStatus"]();

      expect(status.canAccessCloudWorkspaces).toBe(true);
      expect(status.fromFile).toBe(true);
    });

    it("returns canAccessCloudWorkspaces as an own property for a DB license", async () => {
      await saveLicense({
        validUntil: new Date(Date.now() + DAY),
        supportUntil: new Date(Date.now() + DAY),
      });

      const status = await LicenseHandlers["license/getStatus"]();

      // The status crosses to the renderer via postMessage (structured
      // clone), which drops prototype getters.
      expect(Object.getOwnPropertyNames(status)).toEqual(
        expect.arrayContaining(["edition", "canAccessCloudWorkspaces"])
      );
      expect(status.edition).toBe("ultimate");
      expect(status.canAccessCloudWorkspaces).toBe(true);
    });

    it("denies cloud with no license, and stays ultimate", async () => {
      const status = await LicenseHandlers["license/getStatus"]();

      expect(status.edition).toBe("ultimate");
      expect(status.canAccessCloudWorkspaces).toBe(false);
    });
  });

  describe("license/createTrialLicense", () => {
    it("does not exist", () => {
      expect("license/createTrialLicense" in LicenseHandlers).toBe(false);
    });
  });

  describe("license/get", () => {
    it("should return an empty array when no licenses exist", async () => {
      const result = await LicenseHandlers["license/get"]();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it("should return licenses when they exist, without nulls", async () => {
      await saveLicense({
        validUntil: new Date(Date.now() + DAY),
        supportUntil: new Date(Date.now() + DAY),
        licenseType: "TrialLicense",
      });

      const result = await LicenseHandlers["license/get"]();
      expect(result.length).toBe(1);
      expect(result).not.toEqual([null]);
      expect(result[0].licenseType).toBe("TrialLicense");
    });

    it("should return offline license when available", async () => {
      const mockLicense = {
        isValid: true,
        toLicenseKey: vi.fn().mockReturnValue({
          id: 999,
          licenseType: "PersonalLicense",
          fromFile: true,
        }),
      };
      vi.spyOn(OfflineLicense, "load").mockReturnValue(mockLicense as any);

      const result = await LicenseHandlers["license/get"]();
      expect(result.length).toBe(1);
      expect(result[0].fromFile).toBe(true);
      expect(mockLicense.toLicenseKey).toHaveBeenCalled();
    });

    it("should fall back to database licenses for an invalid offline license", async () => {
      const mockLicense = {
        isValid: false,
        toLicenseKey: vi.fn().mockReturnValue(null),
      };
      vi.spyOn(OfflineLicense, "load").mockReturnValue(mockLicense as any);
      await saveLicense({
        validUntil: new Date(Date.now() + DAY),
        supportUntil: new Date(Date.now() + DAY),
        licenseType: "TrialLicense",
      });

      const result = await LicenseHandlers["license/get"]();
      expect(result).not.toEqual([null]);
      expect(result.length).toBe(1);
      expect(result[0].licenseType).toBe("TrialLicense");
    });
  });
});
