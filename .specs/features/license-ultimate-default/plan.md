# License: ultimate by default


## Problem

A product decision by the BKS team: every user gets the full app. Today the edition is worked out
in `keysToStatus` (`src/common/appdb/models/LicenseKey.ts:13-65`) through 7 branches (no license,
expired valid date, expired support date, `maxAllowedAppRelease`, app version). The answer is then
duplicated in `LicenseStatus` getters (`src/lib/license.ts`), in the spread inside
`license/getStatus` (`src/handlers/licenseHandlers.ts:27-48`), in the `licenses/*` getters, in the
root aliases (`src/store/index.ts:305-319`), and in about 44 files that branch on
`isUltimate`/`isCommunity`. Without a valid license, `community` is the fallback
(`LicenseModule.ts:30-34`, and `keysToStatus` when there are no keys or the license has expired),
and it blocks connection types, query editor features, filters, import/backup, plugins, and the
shell.

Once this ships, every user gets every feature with no license, no trial, and no expiry modal.
A license key is used for one thing only: unlocking **Cloud Workspaces**, a hosted service that
still needs an active subscription.

## Flow

This reuses `LicenseKey`, the `license/*` IPC handlers, `LicenseModule` and `CloudClient.getLicense`
as they are. Only the computed status shrinks.

1. On startup, `App.vue` (exists) dispatches `licenses/init` → `licenses/sync` → IPC `license/getStatus`
2. `licenseHandlers` (exists) reads the offline license (`OfflineLicense`) or the `LicenseKey` rows, then calls `keysToStatus` (exists, rewritten). It now **only** computes `canAccessCloudWorkspaces`: a license whose `validUntil` and `supportUntil` are both still in the future.
3. `LicenseStatus` (exists, reduced): `edition` is always `"ultimate"`. It keeps `license`, `fromFile` and `filePath`, and drops the condition, lifetime and version getters.
4. `LicenseModule` (exists): the default `status` is `ultimate`. The `isUltimate`/`isCommunity`/`isTrial`/`isLifetime` getters are removed. Cloud access is the only remaining getter.
5. Components/mixins (exist): every edition gate (`isUltimate`, `isCommunity`, `isUltimateType`, `isUltimateDialect`, all existing) becomes unconditional, and the upsell branches go. Only `NewWorkspaceButton`, `WorkspaceSidebar` and `CloudWorkspacesBlockedModal` still check `canAccessCloudWorkspaces`.
6. `licenses/updateAll` (exists) keeps polling every 10 min, because it revalidates the subscription that controls cloud access.

## Impact

| Front | What changes |
| --- | --- |
| domain | `edition` used to decide which features a user gets. It now has no effect, because it is always `ultimate`. The type stays so the IPC shape doesn't change. |
| domain | `canAccessCloudWorkspaces` used to be `isUltimate && !isLifetime`. It now means "there is a license with validUntil > now and supportUntil > now". An active trial still counts until it expires. |
| domain | removed terms: trial (as a feature unlock), lifetime, `maxAllowedAppRelease` as a version gate, `UpgradeRequired`/upsell, `DevLicenseState` trial states |
| stored data | nothing to migrate. The `license_keys` table and its rows stay as they are. |

## Relations

`None - no stored-data shape change` (`license_keys` intact)

## Surface

`None - nothing consumed outside`: the `license/*` IPC handlers are internal to the app (utility ↔ renderer). The shape change (`getStatus` drops `isCommunity`/`isTrial`/`isLifetime`/`maxAllowedVersion`/`condition`; `createTrialLicense` removed) is covered by AC 1, 11 and 16.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Shipping ultimate by default to every installed user | `LicenseStatus.edition = "ultimate"` is a constant, and no code path returns `"community"` | A `defaultEdition` flag/config: it would keep the branches alive and miss the "simplify" goal |
| Removing the trial | `license/createTrialLicense` and `LicenseKey.createTrialLicense` are deleted. Existing trial rows remain and still give cloud access until `validUntil`. | Keeping the trial just for cloud access: it adds a type whose only effect is a 14-day cloud demo |

- Nothing else is hard to reverse. The `license_keys` table and cloud validation stay.

## Criteria

### S1: Full app with no license (P1)

**Acceptance Criteria**

1. WHEN `keysToStatus([])` runs THEN the system SHALL return `edition === "ultimate"` and `canAccessCloudWorkspaces === false`
2. WHEN `keysToStatus` gets a license with `validUntil` in the past THEN the system SHALL return `edition === "ultimate"`
3. WHEN `keysToStatus` gets a license with `maxAllowedAppRelease` older than the app version THEN the system SHALL return `edition === "ultimate"`
4. The system SHALL initialize `licenses.status.edition` as `"ultimate"` before the first `sync`
5. The system SHALL have no reference to `isCommunity`, `isTrial`, `isLifetime` or `isValidStateExpired` in `src/` or `src-commercial/` (`grep -rE` returns 0 lines)
6. WHEN the MongoDB client connects with Kerberos (GSSAPI) THEN the system SHALL NOT read `LicenseKey` or throw the "Enterprise license" error
7. WHEN `ConnectionInterface` mounts with the default status THEN the system SHALL enable connecting for an ultimate type (e.g. `oracle`), with no upsell message

**Independent test:** a clean profile (empty `license_keys`) opens an Oracle/DuckDB connection, the Quick Filter and the shell, and no upgrade modal appears.

### S2: Cloud Workspaces still need a subscription (P1)

**Acceptance Criteria**

8. WHEN there is a license with `validUntil` and `supportUntil` in the future THEN `canAccessCloudWorkspaces` SHALL be `true`
9. IF `supportUntil` is in the past (formerly "lifetime") THEN `canAccessCloudWorkspaces` SHALL be `false`
10. IF `validUntil` is in the past THEN `canAccessCloudWorkspaces` SHALL be `false`
11. WHEN a valid offline license (`license.json`) exists THEN `license/getStatus` SHALL use it to compute `canAccessCloudWorkspaces`, as it does today
12. WHEN `licenses/sync` finds `canAccessCloudWorkspaces === false` THEN the system SHALL switch to local workspace `-1` (taking over from today's `isLifetime` behavior)
13. WHILE `canAccessCloudWorkspaces === false` the `NewWorkspaceButton` SHALL NOT show the cloud workspace menu

**Independent test:** with no license, the cloud menu doesn't appear. After entering a valid key through `EnterLicenseModal`, it does.

### S3: No trial or expiry UI (P2)

**Acceptance Criteria**

14. The system SHALL NOT register the `TrialExpiredModal`, `LicenseExpiredModal`, `LifetimeLicenseExpiredModal` or `UpgradeRequiredModal` components in `App.vue`. Their files are deleted.
15. The window title SHALL NOT contain "Free Trial" or "Free Version"
16. The IPC handler `license/createTrialLicense` SHALL NOT exist

## Out of scope

| Excluded | Why |
| --- | --- |
| Dropping the `license_keys` table | Cloud still uses it. A destructive migration isn't justified. |
| Moving clients out of `src-commercial/` / relicensing | A legal decision that is separate from the code |
| Changes to the cloud server | The server stays the authority on the account |
| Docs/marketing (pricing, "Ultimate" pages) | Separate product copy |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Effect of `isUltimateType`/`isUltimateDialect` | Removed from the gates. The lists stay only if another consumer still uses them (e.g. an icon/badge); otherwise they're deleted. | Without the gate the lists are dead code | n |
| `EnterLicenseModal` / `LicenseInformation` | Kept, with copy saying the key is for Cloud Workspaces | The only remaining way in for the subscription | n |
| `dev/switchLicenseState` | Reduced to `noLicense`, `activeLicense` and `expiredSupport` | The trial states no longer mean anything | n |
| `ProductTourPlugin` steps that depend on edition | Kept as the ultimate path | Every user now sees the ultimate path | n |
| Legacy jest tests (`tests/unit/common/appdb/models/license.spec.ts`, `store/LicenseModule.spec.ts`, `handlers/licenseHandlers.spec.ts`, `components/AppLicenseExpiry.spec.ts`, `components/ConnectionInterface.spec.ts`) | The ones asserting removed behavior (community/trial/lifetime) are **deleted**, with each one listed in `Test policy` for approval. New specs go in `tests/vitest/unit/`. | CLAUDE.md doesn't allow adding to jest. Asserting removed behavior can't be fixed by weakening the assertion. | n |

**Open questions:** none. The scope ("core + gates") and cloud ("still needs a license") were confirmed.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `ConnectionInterface` | ultimate type with no license | AC 7 |
| screen `NewWorkspaceButton` | without a subscription | AC 13 |
| screen window title | edition labels | AC 15 |
| screen expiry/upgrade modals | removed | AC 14 |
| IPC `license/getStatus` | response shape | AC 1, 11 |
| screen `EnterLicenseModal` | error on an invalid key | existing (`licenses/add` → CloudError), no change |
| UI copy | neutral tone (CLAUDE.md) | applies to the new `EnterLicenseModal` text |

## Sources

- User request (2026-10-15): "simplificar a lógica de checagem de licença e tornar o default a licença ultimate". Confirmed: BKS product decision, scope "core + gates", Cloud Workspaces still need a license.
