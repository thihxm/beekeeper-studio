# License: ultimate by default verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 5be11b2a6..06f45f800
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Every check C1-C18 (both batches) verified at `06f45f800`. Profile `light`: no binding-source
design step, no Coverage recompute, no fault injection. The only binding source is the user request
(plan `Sources`), which decides scope ("core + gates", cloud still needs a license) and no screen
composition. Nothing in it contradicts a check.

## Proof run

One batched invocation from `apps/studio/`:

`yarn vitest:unit tests/vitest/unit/license/keysToStatus.spec.ts tests/vitest/unit/store/LicenseModule.spec.ts tests/vitest/unit/components/ConnectionInterface.spec.ts tests/vitest/unit/handlers/licenseHandlers.spec.ts tests/vitest/unit/components/NewWorkspaceButton.spec.ts -t "no license|expired validUntil is still ultimate|old maxAllowedAppRelease is still ultimate|default status is ultimate|oracle connects without license|active subscription grants cloud|expired support denies cloud|expired validUntil denies cloud|offline license grants cloud|sync without cloud access falls back to local workspace|cloud menu follows canAccessCloudWorkspaces|active trial row still grants cloud" --reporter=verbose`
exit 0. 5 files, 14 passed, 16 skipped. All 12 named tests appear individually as passed
(the "no license" pattern also matched `licenseHandlers > denies cloud with no license, and stays
ultimate` and `license/get > should return an empty array when no licenses exist`, both passed).
All 5 spec files are added/moved by this diff (`git diff --name-status`: 4 `A`, ConnectionInterface `R076` from jest).

The grep proofs (C5, C6, C7, C9, C17, C18) were run verbatim at HEAD, all exit 0. Each pattern
was confirmed discriminating with `git grep` at base `5be11b2a6`: C7 pattern 90 hits,
C9 17, C18 `Free Trial|Free Version` 2 and `createTrialLicense` 7, C6 6 hits of `"community"`
in the four files, C5 file imported `LicenseKey` and threw the "Enterprise license" error.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `keysToStatus([])` -> ultimate, no cloud | batched VU, `keysToStatus > no license` passed | `apps/studio/tests/vitest/unit/license/keysToStatus.spec.ts:34` - `expect(status.edition).toBe("ultimate")`; `:35` - `expect(status.canAccessCloudWorkspaces).toBe(false)`; IPC level also: `apps/studio/tests/vitest/unit/handlers/licenseHandlers.spec.ts:84-85` (same pair through `license/getStatus`) | PASS |
| C2 | expired validUntil still ultimate | batched VU, `expired validUntil is still ultimate` passed | `apps/studio/tests/vitest/unit/license/keysToStatus.spec.ts:42` - `expect(status.edition).toBe("ultimate")` (fixture `validUntil: yesterday()` at :40) | PASS |
| C3 | old maxAllowedAppRelease still ultimate | batched VU, `old maxAllowedAppRelease is still ultimate` passed | `apps/studio/tests/vitest/unit/license/keysToStatus.spec.ts:55` - `expect(status.edition).toBe("ultimate")`; app version forced to 5.0.0 at :47 vs `v0.0.1` at :52, so the old version branch would have returned community | PASS |
| C4 | initial `licenses.status.edition` is ultimate | batched VU, `default status is ultimate` passed | `apps/studio/tests/vitest/unit/store/LicenseModule.spec.ts:65` - `expect(mockSend).not.toHaveBeenCalled()`; `:66` - `expect((store.state as any).licenses.status.edition).toBe("ultimate")` | PASS |
| C5 | MongoDB client has no LicenseKey / Enterprise error | checks.md C5 grep, verbatim, exit 0 | `apps/studio/src-commercial/backend/lib/db/clients/mongodb.ts:100` - `async connect()` now starts directly at the URL/host derivation; the GSSAPI `LicenseKey.getLicenseStatus()` block is deleted in the diff | PASS |
| C6 | no license file computes `"community"` | `! grep -rn '"community"' <4 paths>` exit 0 | `apps/studio/src/lib/license.ts:17` - `edition = "ultimate" as const`; `apps/studio/src/common/appdb/models/LicenseKey.ts:9` - `if (licenses.length === 0) return status;` (no edition assignment anywhere in `keysToStatus`) | PASS |
| C7 | 0 refs to isCommunity/isTrial/isLifetime/isValidStateExpired | checks.md C7 grep, verbatim, exit 0 | `apps/studio/src/store/modules/LicenseModule.ts:40` - getters are only `realLicenses` (:40), `noLicensesFound` (:43), `canAccessCloudWorkspaces` (:46) | PASS |
| C8 | Oracle form + enabled Connect with default store, no upsell | batched VU, `oracle connects without license` passed | `apps/studio/tests/vitest/unit/components/ConnectionInterface.spec.ts:211` - `expect(wrapper.findComponent(OracleForm).exists()).toBe(true)`; `:215` - `expect(connect.at(0).attributes('disabled')).toBeUndefined()`; `:217` - `expect(wrapper.text()).not.toMatch(/upgrade/i)`; store uses the real `LicenseModule` at default (:56) | PASS |
| C9 | 0 gates on isUltimateType/isUltimateDialect | checks.md C9 grep, verbatim, exit 0 (also 0 across all of `src`/`src-commercial`) | `apps/studio/src/components/ConnectionInterface.vue:126` - `v-if="config.connectionType === 'oracle'"` (was `&& isUltimate`) | PASS |
| C10 | both dates future -> cloud true | batched VU, `active subscription grants cloud` passed | `apps/studio/tests/vitest/unit/license/keysToStatus.spec.ts:62` - `expect(status.canAccessCloudWorkspaces).toBe(true)` | PASS |
| C11 | supportUntil past, validUntil future -> cloud false | batched VU, `expired support denies cloud` passed | `apps/studio/tests/vitest/unit/license/keysToStatus.spec.ts:69` - `expect(status.canAccessCloudWorkspaces).toBe(false)` (fixture :67 `validUntil: tomorrow(), supportUntil: yesterday()`) | PASS |
| C12 | validUntil past -> cloud false | batched VU, `expired validUntil denies cloud` passed | `apps/studio/tests/vitest/unit/license/keysToStatus.spec.ts:76` - `expect(status.canAccessCloudWorkspaces).toBe(false)` (fixture :74 `validUntil: yesterday(), supportUntil: tomorrow()`) | PASS |
| C13 | offline license -> cloud true, fromFile true via `license/getStatus` | batched VU, `offline license grants cloud` passed | `apps/studio/tests/vitest/unit/handlers/licenseHandlers.spec.ts:60` - `expect(status.canAccessCloudWorkspaces).toBe(true)`; `:61` - `expect(status.fromFile).toBe(true)` | PASS |
| C14 | sync without cloud -> workspaceId -1 | batched VU, `sync without cloud access falls back to local workspace` passed | `apps/studio/tests/vitest/unit/store/LicenseModule.spec.ts:84` - `expect((store.state as any).workspaceId).toBe(-1)` (preset 5 at :79, status `canAccessCloudWorkspaces: false` at :80) | PASS |
| C15 | NewWorkspaceButton cloud x-menu follows the getter | batched VU, `cloud menu follows canAccessCloudWorkspaces` passed | `apps/studio/tests/vitest/unit/components/NewWorkspaceButton.spec.ts:29` - `expect(blocked.find("x-menu").exists()).toBe(false)`; `:33` - `expect(allowed.find("x-menu").exists()).toBe(true)` | PASS |
| C16 | active TrialLicense row still grants cloud | batched VU, `active trial row still grants cloud` passed | `apps/studio/tests/vitest/unit/license/keysToStatus.spec.ts:87` - `expect(status.canAccessCloudWorkspaces).toBe(true)` (fixture `licenseType: "TrialLicense"` at :84) | PASS |
| C17 | 4 modal files gone, App.vue has no reference | checks.md C17 ls+grep, verbatim, exit 0 | `apps/studio/src/App.vue:45` - `<template v-if="licensesInitialized">` now holds only `<cloud-workspaces-blocked-modal />` (:46); the 4 files are `D` in `git diff --name-status` | PASS |
| C18 | no "Free Trial"/"Free Version"; no createTrialLicense | both greps exit 0 | `apps/studio/src/store/index.ts:504` - `const title = config ? ... - Beekeeper Studio : 'Beekeeper Studio'` (suffixes deleted); `apps/studio/tests/vitest/unit/handlers/licenseHandlers.spec.ts:91` - `expect("license/createTrialLicense" in LicenseHandlers).toBe(false)` (ran in the full-suite gate) | PASS |

### Level and sampling judgment

- C1, C2, C3, C10-C12, C16 sit at the pure-function layer, which is where the decision is made.
  The IPC response shape (plan `Observable`: AC 1, 11) is reached across the handler by
  `licenseHandlers.spec.ts:77-85` and C13, so the claim's level is met.
- C2, C3, C14 would each fail under the base implementation (community on expired/old version;
  `isLifetime`-only fallback leaves workspace 5).
- C15 does not discriminate this diff on its own: the `x-menu v-if="credentials.length && $store.getters.canAccessCloudWorkspaces"` gate is identical at base
  (`git show 5be11b2a6:.../NewWorkspaceButton.vue` line 9). The claim (AC 13) is still proven;
  the behaviour that changed is the meaning of the getter, which C10-C12/C16 cover.
- Grep checks (C5, C6, C7, C9, C17, C18) are presence/absence claims and greps are the right level.
  Each pattern was shown to hit at base, so none is a vacuous zero.

### Swept `existing` rows re-read

- concurrency: `inflightUpdateAll` / `inflightUpdates` present at `apps/studio/src/store/modules/LicenseModule.ts:24-25`
  (checks.md cites 27-28, base numbering; constraint is there, line numbers stale).
- dependency failure: `licenses/update` with `CloudError` handling at `apps/studio/src/store/modules/LicenseModule.ts:102-161`
  (checks.md cites 152-212, base numbering; constraint is there).
- authorization: cloud server remains authority; `licenses/add` still goes through `CloudClient.getLicense` (`LicenseModule.ts:83`).

## Findings (adversarial diff read)

Ranked by severity. None contradicts a check or the binding source; none fails the feature.

1. **Low - cloud data scope no longer forced local by edition.** `apps/studio/src/components/data/DataManager.vue:76`
   changed from `isUltimate ? this.workspace.type : 'local'` to `this.workspace.type`. Cloud gating
   now relies entirely on `workspaceId` staying `-1` without a subscription, which is enforced in
   three places: `LicenseModule.ts:194` (sync), `CredentialsModule.ts:169` (restore),
   `WorkspaceSidebar.vue:110` (click). Consistent with the plan; noted because the defence in
   depth went from two layers to one. Not a broadening for any user who was previously gated
   (lifetime users were already `isUltimate` here).
2. **Low - leftover "Premium" copy.** `apps/studio/src/components/ConnectionInterface.vue:359`
   `friendlyConnectionType` still falls back to `"Premium"` for an unknown type. Only shows for an
   unknown `connectionType`; dead upsell vocabulary.
3. **Cosmetic - dead upsell remnants.** `apps/studio/src/components/NotificationManager.vue:61`
   onboarding noty still declares `killer: 'upsell'` (the `upsell` queue no longer exists; harmless);
   `apps/studio/src/assets/styles/app/modals.scss:18` `.upgrade-modal` and
   `apps/studio/src/assets/styles/app/_typography.scss:14` `.trial-expired-text` are now unused CSS.
4. **Checks precision note - stale Swept line citations** (see above): 27-28 -> 24-25, 152-212 -> 102-161.

Searches that came back clean (no remaining gate in another form):
`grep -rnE "isUltimate"` src/src-commercial: 0; `\bedition\b` outside `lib/license.ts`: only a Snowflake
comment; `'community'|"community"`: only plugin-origin / dialect-list names, no edition use;
`upgradeModal|upsell|UpgradePanel|UpgradeAlert`: only the noty `killer` above; `licenses/<getter>`
reads: only `canAccessCloudWorkspaces`, `init`, `updateAll`, `add`, `remove` (all exist);
`licenseDaysLeft|trialLicense|maxAllowedVersion|isValidDateExpired|isSupportDateExpired|toggleShowBeginTrialModal|stars</i>`: 0;
`canAccessCloudWorkspaces` consumers: exactly `NewWorkspaceButton`, `WorkspaceSidebar`,
`CredentialsModule`, `LicenseModule.sync`, `LicenseInformation` (status label), matching plan step 5.
`FavoriteList.importFromLocal` lost a `!isCloud` upgrade guard, but its menu item is already
`v-if="isCloud"` (`FavoriteList.vue:33`), so no cloud broadening.
UI copy (CLAUDE.md style): added strings - `EnterLicenseModal` "A license key with an active
subscription unlocks Cloud Workspaces. Every other feature works without a license." / "No license
registered. Register a license below.", `CloudWorkspacesBlockedModal`, `LicenseInformation`
status labels, dev-menu labels - are neutral; no "we" in any added user-facing string.

## Gate

`yarn vitest:unit` (full unit config) - 38 files, 2642 passed, 0 failed, 1 todo.
`yarn test:unit tests/unit/backend/lib/OfflineLicense.spec.js tests/unit/store/CredentialsModule.spec.ts tests/unit/components/ImportExportDatabase.spec.ts tests/unit/components/sidebar/connection/ConnectionListItem.spec.ts` (jest specs edited by the diff) - 4 suites, 27 passed, 0 failed.
`npx eslint <changed src files>` - 0 errors (101 pre-existing-style warnings).
