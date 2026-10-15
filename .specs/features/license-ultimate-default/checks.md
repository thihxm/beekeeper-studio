# License: ultimate by default checks

Profile: light
Plan: `.specs/features/license-ultimate-default/plan.md`

18 checks in 3 slices · 2 one-way doors · 0 open

Every proof runs from `apps/studio/`. `VU` = `yarn vitest:unit` (the `vitest.config.mjs` script that CI already uses).

## Checks

The plan's S1 is split into **S1a (core)** and **S1b (gates)** because S1 alone is ~162k, which is over the budget (see Handoff). The cut follows the boundary between the status and its consumers.

### S1a - core: status always ultimate · 9 files · 102 KB · ~25k

**C1** - `keysToStatus([])` returns `edition === "ultimate"` and `canAccessCloudWorkspaces === false` (AC 1) ✅
Proof: `VU tests/vitest/unit/license/keysToStatus.spec.ts -t "no license"`

**C2** - `keysToStatus` with `validUntil` = yesterday returns `edition === "ultimate"` (AC 2) ✅
Proof: `VU tests/vitest/unit/license/keysToStatus.spec.ts -t "expired validUntil is still ultimate"`

**C3** - `keysToStatus` with `maxAllowedAppRelease.tagName = "v0.0.1"` (older than the app) returns `edition === "ultimate"` (AC 3) ✅
Proof: `VU tests/vitest/unit/license/keysToStatus.spec.ts -t "old maxAllowedAppRelease is still ultimate"`

**C4** - The initial state of the `licenses` module has `status.edition === "ultimate"` before any `sync` (AC 4) ✅
Proof: `VU tests/vitest/unit/store/LicenseModule.spec.ts -t "default status is ultimate"`

**C5** - The MongoDB client doesn't import `LicenseKey` and doesn't contain the string "Enterprise license" (AC 6) ✅
Proof: `! grep -nE "LicenseKey|Enterprise license" src-commercial/backend/lib/db/clients/mongodb.ts`

**C6** - No license file computes `"community"`: 0 occurrences of `"community"` in `src/lib/license.ts`, `src/common/appdb/models/LicenseKey.ts`, `src/store/modules/LicenseModule.ts` and `src/handlers/` (door 1) ✅
Proof: `! grep -rn '"community"' src/lib/license.ts src/common/appdb/models/LicenseKey.ts src/store/modules/LicenseModule.ts src/handlers`

### S1b - gates removed from consumers · 33 files · 547 KB · ~137k

**C7** - 0 references to `isCommunity`, `isTrial`, `isLifetime` or `isValidStateExpired` in `src/` and `src-commercial/` (AC 5)
Proof: `! grep -rnE "isCommunity|isTrial|isLifetime|isValidStateExpired" src src-commercial`

**C8** - `ConnectionInterface` mounted with the default store and `connectionType = "oracle"` renders the Oracle form with the Connect button enabled, and does not render `UpgradeAlert`/upsell text (AC 7)
Proof: `VU tests/vitest/unit/components/ConnectionInterface.spec.ts -t "oracle connects without license"`

**C9** - 0 gates on `isUltimateType`/`isUltimateDialect` in components and mixins (AC 7, gates part)
Proof: `! grep -rnE "isUltimateType|isUltimateDialect" src/components src/mixins src/plugins`

### S2 - Cloud Workspaces need a subscription · (in S1a + 2 files) · ~6k

**C10** - A license with `validUntil` and `supportUntil` = tomorrow gives `canAccessCloudWorkspaces === true` (AC 8) ✅
Proof: `VU tests/vitest/unit/license/keysToStatus.spec.ts -t "active subscription grants cloud"`

**C11** - `supportUntil` = yesterday and `validUntil` = tomorrow gives `canAccessCloudWorkspaces === false` (AC 9) ✅
Proof: `VU tests/vitest/unit/license/keysToStatus.spec.ts -t "expired support denies cloud"`

**C12** - `validUntil` = yesterday gives `canAccessCloudWorkspaces === false` (AC 10) ✅
Proof: `VU tests/vitest/unit/license/keysToStatus.spec.ts -t "expired validUntil denies cloud"`

**C13** - With a valid offline license (mocked `OfflineLicense.load` returning an active license), `license/getStatus` returns `canAccessCloudWorkspaces === true` and `fromFile === true` (AC 11) ✅
Proof: `VU tests/vitest/unit/handlers/licenseHandlers.spec.ts -t "offline license grants cloud"`

**C14** - `licenses/sync` with `canAccessCloudWorkspaces === false` and `workspaceId = 5` changes `workspaceId` to `-1` (AC 12) ✅
Proof: `VU tests/vitest/unit/store/LicenseModule.spec.ts -t "sync without cloud access falls back to local workspace"`

**C15** - `NewWorkspaceButton` with credentials and `canAccessCloudWorkspaces === false` doesn't render the cloud `x-menu`; with `true` it does (AC 13) ✅
Proof: `VU tests/vitest/unit/components/NewWorkspaceButton.spec.ts -t "cloud menu follows canAccessCloudWorkspaces"`

**C16** - An existing `TrialLicense` row with `validUntil` = tomorrow still gives `canAccessCloudWorkspaces === true` (door 2) ✅
Proof: `VU tests/vitest/unit/license/keysToStatus.spec.ts -t "active trial row still grants cloud"`

### S3 - no trial or expiry UI · 16 files · 49 KB · ~12k

**C17** - The files `TrialExpiredModal.vue`, `LicenseExpiredModal.vue`, `LifetimeLicenseExpiredModal.vue` and `UpgradeRequiredModal.vue` don't exist, and `App.vue` doesn't reference them (AC 14) ✅
Proof: `! ls src/components/license/TrialExpiredModal.vue src/components/license/LicenseExpiredModal.vue src/components/license/LifetimeLicenseExpiredModal.vue src/components/upsell/UpgradeRequiredModal.vue 2>/dev/null | grep . && ! grep -nE "TrialExpiredModal|LicenseExpiredModal|LifetimeLicenseExpiredModal|UpgradeRequiredModal" src/App.vue`

**C18** - 0 occurrences of "Free Trial" and "Free Version" in `src/` (AC 15), and 0 of `createTrialLicense` in `src/` and `src-commercial/` (AC 16) ✅
Proof: `! grep -rnE "Free Trial|Free Version" src`
Proof: `! grep -rn "createTrialLicense" src src-commercial`

Build closure (no check of its own, not an AC): `yarn lint`, `yarn build` (tsc), `yarn vitest:unit` and `yarn test:unit` all green.

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| former `keysToStatus` branches -> edition (5) | no license C1 · expired valid C2 · expired support C11 · nil maxAllowed C10 · old maxAllowed C3 | - |
| `canAccessCloudWorkspaces` inputs (5) | no license C1 · both active C10 · support expired C11 · valid expired C12 · active trial C16 | - |
| status sources in `license/getStatus` (2) | offline file C13 · DB rows C1 | - |
| removed modals (4) | `TrialExpiredModal` C17 · `LicenseExpiredModal` C17 · `LifetimeLicenseExpiredModal` C17 · `UpgradeRequiredModal` C17 | - |
| removed getters (4) | `isCommunity` C7 · `isTrial` C7 · `isLifetime` C7 · `isValidStateExpired` C7 | - |
| backend gates in commercial (1) | mongodb kerberos C5 | - |
| Landing doors (2) | ultimate constant C6 · trial removed C18 + C16 | - |
| startup config: initial status (2 places) | renderer `LicenseModule` default C4 · utility `keysToStatus` C1 | - |

- C8 crosses the boundary (a mounted component). The other gates are proven by grep (C7, C9). Each removed branch disappears in the diff, so there is no runtime test for each of the 33 files. **light** does not see a gate that was rewritten into a different form; the Verifier reads the diff.

## Legacy specs (jest) to delete

These assert behavior the plan removes. They are deleted rather than weakened (critical rule 3). Each deletion is listed here and goes in the commit of its slice:

- `tests/unit/common/appdb/models/license.spec.ts`: community/lifetime/version edition, replaced by `tests/vitest/unit/license/keysToStatus.spec.ts`
- `tests/unit/store/LicenseModule.spec.ts`: isTrial/isLifetime getters, replaced by `tests/vitest/unit/store/LicenseModule.spec.ts`
- `tests/unit/handlers/licenseHandlers.spec.ts`: createTrialLicense / getStatus spread, replaced by `tests/vitest/unit/handlers/licenseHandlers.spec.ts`
- `tests/unit/components/AppLicenseExpiry.spec.ts`: expiry modals, which are removed (AC 14)
- `tests/unit/components/ConnectionInterface.spec.ts`: only the community/upsell cases. If other cases remain, the file moves to vitest with them (migration, not deletion).

`tests/unit/backend/lib/OfflineLicense.spec.js` and `tests/unit/store/CredentialsModule.spec.ts` stay. They are fixed only if they reference a removed getter.

## Swept

- validation: n/a - no new input; `licenses/add` (cloud key validation) is unchanged
- failure modes: C12, C11 (expired license now degrades only cloud access)
- idempotency: n/a - `keysToStatus` is a pure function; `sync` already gets the same result when repeated
- authorization: C10, C15 - Cloud Workspaces stay gated; the cloud server remains the authority (existing)
- concurrency: existing - `inflightUpdateAll`/`inflightUpdates` in `LicenseModule.ts:27-28`, unchanged
- data lifecycle: n/a - `license_keys` unchanged, no migration (plan Relations)
- dependency failure: existing - `licenses/update` treats `CloudError` (`LicenseModule.ts:152-212`), unchanged; only cloud access depends on it
- state transitions: C14 (losing cloud access → workspace -1), C16
- observability: n/a - no logging requirement; `condition` is gone and was only used for internal branching

## Handoff

`wc -c` / 4 per slice: S1a 102 KB ≈ 25k · S2 adds ~6k (2 new specs + NewWorkspaceButton) · S3 49 KB ≈ 12k · S1b 547 KB ≈ 137k.

- S1a + S2 + S3 = **43k**, all on the license side (core, store, App, modals). S1b enters the consumers (33 components/mixins) at **180k total**, over the 150k budget → proposed cut **after S3**: batch 1 = S1a, S2, S3 (C1-C6, C10-C18); batch 2 = S1b (C7-C9) reading `checks.md` + the batch-1 diff.
- Note: the 137k for S1b assumes reading each file whole. In practice a gate is a few lines found with grep, so one builder would probably fit. The rule still says to ask.
- Mechanism: **handoff** (user choice, 2026-10-15). Batch 1 = S1a+S2+S3, batch 2 = S1b, sequential, only on green. Legacy spec deletion approved by the user.
