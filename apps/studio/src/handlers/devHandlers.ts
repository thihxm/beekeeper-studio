import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from "@/common/platform_info";
import { DevLicenseState } from "@/lib/license";

export interface IDevHandlers {
  "dev/switchLicenseState": ({ state, sId }: { state: DevLicenseState; sId: string; }) => Promise<void>;
}

export const DevHandlers: IDevHandlers = {
  "dev/switchLicenseState": async function ({ state }: { state: DevLicenseState; sId: string; }) {
    if (!platformInfo.isDevelopment) {
      throw new Error("Not allowed");
    }

    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1));
    switch (state) {
      case DevLicenseState.noLicense:
        await LicenseKey.clear();
        break;
      case DevLicenseState.activeLicense: {
        await LicenseKey.clear();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = nextMonth;
        license.licenseType = "PersonalLicense";
        await license.save();
        break;
      }
      case DevLicenseState.expiredSupport: {
        await LicenseKey.clear();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = yesterday;
        license.licenseType = "PersonalLicense";
        await license.save();
        break;
      }
      default:
        console.warn("Unknown license state");
    }
  },
};
