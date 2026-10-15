import { TransportLicenseKey } from "@/common/transport";
import { Version } from "@/common/version";
export interface BksVersion extends Version {
  channel: 'stable' | 'beta' | 'alpha'
  channelRelease?: number
}

export enum DevLicenseState {
  noLicense,
  activeLicense,
  expiredSupport,
}


export class LicenseStatus {
  /** Every user gets the full app. Kept so the IPC shape doesn't change. */
  edition = "ultimate" as const
  /**
   * Cloud Workspaces are a hosted service and require an active
   * subscription: a license whose validUntil and supportUntil are both in
   * the future. A plain field (not a getter) so it survives structured clone.
   */
  canAccessCloudWorkspaces = false
  license?: TransportLicenseKey
  fromFile = false
  filePath?: string = undefined
}
