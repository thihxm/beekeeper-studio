import { LicenseStatus } from "@/lib/license";
import { Column, Entity, Not } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash';

export function keysToStatus(licenses: LicenseKey[]): LicenseStatus {
    const status = new LicenseStatus();
    if (licenses.length === 0) return status;

    const currentLicense = _.orderBy(licenses, ["validUntil"], ["desc"])[0];
    status.license = currentLicense;

    // Every user gets the full app. A license only unlocks Cloud Workspaces,
    // which need an active subscription. Active trial rows still count.
    const currentDate = new Date();
    status.canAccessCloudWorkspaces =
      currentDate < currentLicense.validUntil &&
      currentDate < currentLicense.supportUntil;
    return status;
}


@Entity({ name: 'license_keys' })
export class LicenseKey extends ApplicationEntity {

  withProps(props: any) {
    console.log("merging props into me:", props)
    if (props) LicenseKey.merge(this, props);
    return this;
  }

  fromFile = false

  @Column({type: 'varchar', nullable: false})
  email: string

  @Column({type: 'varchar', nullable: false})
  key: string

  @Column({type: 'datetime', nullable: false})
  validUntil: Date

  @Column({type: 'datetime', nullable: false})
  supportUntil: Date

  @Column({ type: 'varchar', nullable: false })
  licenseType: 'TrialLicense' | 'PersonalLicense' | 'BusinessLicense'

  @Column({ type: 'json', nullable: true })
  maxAllowedAppRelease: { tagName: string }

  @Column({ type: 'datetime', nullable: true })
  invalidatedAt: Date | null

  /** Get all licenses except trial */
  static async all() {
    return await LicenseKey.findBy({ licenseType: Not("TrialLicense" as const) });
  }

  /** Delete all licenses except trial */
  static async wipe() {
    await LicenseKey.delete({ licenseType: Not("TrialLicense" as const) });
  }


  static async getLicenseStatus(): Promise<LicenseStatus> {
    const licenses = await LicenseKey.find();
    return keysToStatus(licenses)
  }

  public get active() : boolean {
    return this.validUntil && this.validUntil > new Date()
  }
}
