# Multi-database polish verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: a872950f2^..2fe15f81c
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 32 proofs pass at `2fe15f81c`. The 5 Round 1 faults that were re-injected (F1, F2, F4, F5, plus F3 as a control) are now **all killed**, and so is the new errno-only MySQL fault (F6). C22 now starts where its claim starts: the `revealSidebarItem` event. It is PASS.

The verdict is still **FAIL**, because two further one-line faults on the C15/C16 path survive the whole Vitest suite:

- **F7:** the modal's `@submit="save"` binding is dropped.
- **F8:** `<DatabaseColorModal />` is no longer mounted in `TableList`.

The new color-flow spec stubs `BaseModal` and calls `vm.save(...)` directly, so the Save button never reaches the code under test. "Choosing" a color is therefore still proven only up to the open modal, which leaves a smaller level gap on C15 and C16 than Round 1 found.

Scope follows verify.md "Re-verifying after a fix":

- All proofs re-ran at the new HEAD.
- Faults were re-injected on the surfaces the fix touched or re-targeted.
- C15, C16 and C22, the non-PASS rows, were re-judged.
- Citations were refreshed for the 3 touched spec files. Other citations are unchanged from Round 1, because the fix touched no other file.

The fix (`bda383924..2fe15f81c`) touches only tests and `plan.md`. No `src` file changed, and neither did `checks.md`.

## Proof run (verified at 2fe15f81c)

All commands ran from `apps/studio/` in the main checkout at `2fe15f81c`, on a clean tree.

- **Batched VU, one invocation.**
  - Command: `yarn vitest:unit <the 12 proof spec files> tests/vitest/unit/components/databaseColorFlow.spec.ts -t "<the 31 proof names from checks.md, verbatim>|<the 4 tests the fix added>" --reporter=verbose`.
  - No proof name contains an apostrophe.
  - Result: exit 0. **13 files, 35 passed, 14 skipped.**
  - Every one of the 31 proof names has its own `✓` line. So do the 4 added tests: the 3 in `databaseColorFlow.spec.ts` and `the utility lists inaccessible databases from the active client`. The 14 skipped tests are the non-proof tests in those files.
- **C1 (integration, Docker): carried from bda383924.** The fix touched no database code, client or integration spec, so the Round 1 run still stands. That run was `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts`: exit 0, 2 passed. The verbose `-t` re-run showed C1 passing on its own.
- **C14 grep proof (verbatim):** exit 0. The index is at `src/migration/20261016_create_database_labels.js:16`, and the import is at `src/migration/index.js:101`.
- **C24 grep proof (verbatim):** exit 0. `default.config.ini:84` has `revealActiveEntity = true`, and `bksConfig.d.ts` has a count of 1.
- **Full `yarn vitest:unit`:** exit 0. **61 files, 2732 passed, 0 failed, 1 todo.** That is one more file and 4 more tests than Round 1, all from the fix.
- **Full legacy Jest `yarn test:unit`:** exit 0. **80 suites, 799 passed, 0 failed.**

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | A role without CONNECT gets a list that contains `secret` and not `a` | carried from bda383924. VI exit 0, and the test ran on its own (`✓`) | `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:86` - `toContain("secret")`. `:87` - `not.toContain("a")` | PASS |
| C2 | SQL Server SQL contains `HAS_DBACCESS(name) = 0` and returns names | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/lib/db/inaccessibleDatabases.spec.ts:16` - `toContain('HAS_DBACCESS(name) = 0')`. `:18` - `toEqual(['finance', 'hr'])` | PASS |
| C3 | A client that doesn't override it (MySQL) returns `[]` | verified at 2fe15f81c. Batched VU, passed | `inaccessibleDatabases.spec.ts:26` - `toEqual([])` | PASS |
| C4 | The 4 driver errors become `DATABASE_ACCESS_DENIED` | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/handlers/accessDenied.spec.ts:39` - the MySQL case is now `{ errno: 1044 }` alone. `:43` - `toHaveLength(4)`. `:45` - a fifth, code-only `ER_DBACCESS_DENIED_ERROR` case. `:49` - `rejected.code).toBe(DATABASE_ACCESS_DENIED)` for each case. Errno 1044 is now isolated, and F6 is killed | PASS |
| C5 | A 28P01 error is rethrown as the same object | verified at 2fe15f81c. Batched VU, passed | `accessDenied.spec.ts:60` - `expect(rejected).toBe(error)`. `:61` - `code).toBe("28P01")` | PASS |
| C6 | The utility's `errorCode` becomes `err.code` | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/lib/utility/UtilityConnection.spec.ts:20` - `toBeInstanceOf(Error)`. `:22` - `code).toBe("DATABASE_ACCESS_DENIED")` | PASS |
| C7 | The list gives `["secret"]`. On a reject it gives `[]` and the database list is still committed | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:130` - `toEqual(["secret"])`. `:138` - `toEqual([])`. `:139` - the list is committed. The utility route is now covered as well: `accessDenied.spec.ts:68` - `ConnHandlers["conn/listInaccessibleDatabases"]` returns `["secret"]` (F5 killed) | PASS |
| C8 | Access denied on load locks `b` | verified at 2fe15f81c. Batched VU, passed | `databaseEntities.spec.ts:152` - `inaccessibleDatabases).toContain("b")` | PASS |
| C9 | Class, icon, aria-disabled and tabindex are set, and nothing loads | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:211-214` - all 4 attributes. `:218` - `toHaveBeenCalledTimes(0)`. F3 (control) is killed | PASS |
| C10 | Tooltip text with and without a username, trigger `hover focus` | verified at 2fe15f81c. Batched VU, passed | `VirtualTableList.spec.ts:230-233` - `__tooltip` content and `trigger: "hover focus"`. `:239` - the content without a username. F3 is killed here too | PASS |
| C11 | After a clear, `inaccessibleDatabases` is `[]` | verified at 2fe15f81c. Batched VU, passed | `databaseEntities.spec.ts:77` - `inaccessibleDatabases).toEqual([])` | PASS |
| C12 | A locked database has 0 index items | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:39` - `toHaveLength(0)`. `:40` - databases `toEqual(["a"])` | PASS |
| C13 | A tab on locked `b` shows the message and no slot | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:58` - the message. `:59` - `.table-slot` is absent | PASS |
| C14 | Unique index, and 2 saves leave 1 row holding the second color | verified at 2fe15f81c. Grep exit 0, batched VU passed | `src/migration/20261016_create_database_labels.js:16` (the index). `apps/studio/tests/vitest/unit/common/appdb/databaseLabels.spec.ts:21` - `toHaveLength(1)`. `:22` - `color).toBe('purple')` | PASS |
| C15 | Choosing purple dispatches the save, and the bar has the purple class | verified at 2fe15f81c. Batched VU, all passed | `apps/studio/tests/vitest/unit/components/databaseColorFlow.spec.ts:20-22` - the "Set color" menu entry triggers `openDatabaseColorModal` with `"b"`. `:46-49` - the event opens the modal for `b`. `:53` - **`vm.save(...)` is called directly**. `:56` - the dispatch payload is `{ databaseName: "b", color: "purple" }` (F4 killed). `VirtualTableList.spec.ts:248` - the purple class. **Residual level gap:** `BaseModal` is stubbed, so the link from the Save button to `@submit="save"` is unproven, and so is the modal's mount in `TableList`. F7 and F8 survive the full suite. `checks.md` still cites only the store-level proofs | FAIL |
| C16 | Choosing default sends remove, and the bar has no color class | verified at 2fe15f81c. Batched VU, all passed | `apps/studio/tests/vitest/unit/store/databaseLabels.spec.ts:46` - `appdb/databaseLabels/remove`. `:47` - `colorFor("b")).toBeNull()`. `VirtualTableList.spec.ts:249` - no color class. The modal path is the same as C15, so the same residual gap applies (F7, F8). No test runs `default` through the modal | FAIL |
| C17 | Stripe and badge are purple on `b` and green on the default | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:40-41` - purple. `:44-45` - green | PASS |
| C18 | An unsaved connection updates the store and sends 0 label requests | verified at 2fe15f81c. Batched VU, passed | `databaseLabels.spec.ts:54` - `toBe("purple")`. `:55` - `toHaveLength(0)` | PASS |
| C19 | `load` sends find with `where {connectionId:3, workspaceId:-1}` | verified at 2fe15f81c. Batched VU, passed | `databaseLabels.spec.ts:62` - the find payload. The AC 19 trigger is now covered too: `databaseColorFlow.spec.ts:65-67` - the `CoreInterface` `usedConfig` watcher dispatches `databaseLabels/load` (F2 killed) | PASS |
| C20 | Keys `b::table.public.users` and `table.public.users`, and the header commits the key | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/components/revealActiveEntity.spec.ts:73-74` - the two keys. `:84-85` - commits `selectSidebarItem` and triggers `AppEvent.revealSidebarItem` | PASS |
| C21 | View key is `view.public.v` | verified at 2fe15f81c. Batched VU, passed | `revealActiveEntity.spec.ts:90` - `toBe("view.public.v")` | PASS |
| C22 | Selecting with reveal on expands `b` and its schema, loads, and scrolls to the index | verified at 2fe15f81c. Batched VU, passed | `revealActiveEntity.spec.ts:101` - `vm.$root.$emit(AppEvent.revealSidebarItem, "b::table.public.users")`, which is the event C20 proves the header triggers. `:102` - `b` is expanded. `:104` - the load for `b`. `:112` - the schema is expanded. `:115` - `scrollToIndex(index)`. The proof now starts at the event, and F1 is killed | PASS |
| C23 | With reveal off, nothing expands and nothing scrolls | verified at 2fe15f81c. Batched VU, passed | `revealActiveEntity.spec.ts:123` - the event is emitted. `:126` - expansion is unchanged. `:127` - `scrollToIndex` called 0 times. `:128` - 0 loads. This is no longer vacuous: C22 kills F1 in the same component, so the listener is known to exist | PASS |
| C24 | The ini declares `revealActiveEntity = true`, and it is typed | verified at 2fe15f81c. Grep exit 0 | `apps/studio/default.config.ini:84`. `bksConfig.d.ts` count 1 | PASS |
| C25 | 3 entries with all 3 fields each | verified at 2fe15f81c. Batched VU, passed | `apps/studio/tests/vitest/unit/services/pluginDatabases.spec.ts:48-52` - the full `toEqual` | PASS |
| C26 | `multipleDatabases` disabled gives `[]` | verified at 2fe15f81c. Batched VU, passed | `pluginDatabases.spec.ts:57` - `toEqual([])` | PASS |
| C27 | `database: "b"` is sent, and omitting it sends no key | verified at 2fe15f81c. Batched VU, passed | `pluginDatabases.spec.ts:70` - `database: "b"`. `:75` - `not.toHaveProperty("database")` | PASS |
| C28 | A query tab gives `b`, or the default `a`. A table tab resolves `b`'s orders | verified at 2fe15f81c. Batched VU, passed | `pluginDatabases.spec.ts:93-94`, `:97`. `:98` - `data.table).toBe(ordersB)` | PASS |
| C29 | Connection info keeps the default `a` | verified at 2fe15f81c. Batched VU, passed | `pluginDatabases.spec.ts:103` - `databaseName).toBe("a")` | PASS |
| C30 | The bridge routes `getDatabases` and the `runQuery` database | verified at 2fe15f81c. Batched VU, passed | `pluginDatabases.spec.ts:119-120`. `:124` - `runQuery).toHaveBeenCalledWith("select 1", "b")` | PASS |
| C31 | Disconnected gives the noDatabase message | verified at 2fe15f81c. Batched VU, passed | `pluginDatabases.spec.ts:62` - `toThrow("No database connection found")` | PASS |
| C32 | A locked database gives code `DATABASE_ACCESS_DENIED` | verified at 2fe15f81c. Batched VU, passed | `pluginDatabases.spec.ts:87` - `rejected.code).toBe("DATABASE_ACCESS_DENIED")` | PASS |

## Faults injected

Faults ran at verified at 2fe15f81c.

**Isolation.**

- The worktree was created with `git worktree add --detach /private/tmp/claude-503/verify-polish-r2 2fe15f81c`.
- It had symlinks to the main checkout's root, `apps/studio` and `apps/ui-kit` `node_modules`, and to `apps/ui-kit/dist`.
- Baseline: the 4 covering spec files passed unmutated (4 files, 19 tests).

**Method.**

- A script applied each fault as one exact-substring replacement, asserting a single match.
- It then ran `yarn vitest:unit <narrowest covering spec>` on the whole file, with no `-t` filter.
- After each run it ran `git checkout -- <file>` and asserted that the tracked tree was clean.
- F7 and F8 survived their narrowest spec, so I applied them together and ran the full `yarn vitest:unit`. Result: 61 files, 2732 passed, 0 failed. Both survive.

**Cleanup.** The worktree was removed with `git worktree remove --force` and then pruned. The main tree's `git status --porcelain` was empty before and after; the two were diffed and are identical.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 drop the root binding `{ event: AppEvent.revealSidebarItem, handler: this.revealItem }` | `apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue:447` | yes - `revealActiveEntity.spec.ts` `reveals the selected table in its database` |
| F2 drop `await this.$store.dispatch('databaseLabels/load')` from the `usedConfig` watcher | `apps/studio/src/components/CoreInterface.vue:147` | yes - `databaseColorFlow.spec.ts` `loads the colors of the connection` |
| F3 (control) `Item.vue` passes `:locked="false"` | `apps/studio/src/components/sidebar/core/table_list/Item.vue:7` | yes - `VirtualTableList.spec.ts`, 2 locked-database tests |
| F4 `DatabaseColorModal.save` no longer dispatches `databaseLabels/setColor` | `apps/studio/src/components/sidebar/core/DatabaseColorModal.vue:56` | yes - `databaseColorFlow.spec.ts` `the color modal saves the picked color for its database` |
| F5 the utility route `conn/listInaccessibleDatabases` returns `[]` | `apps/studio/src-commercial/backend/handlers/connHandlers.ts:422` | yes - `accessDenied.spec.ts` `the utility lists inaccessible databases from the active client` |
| F6 remove `1044` from `ACCESS_DENIED_CODES` (errno-only MySQL) | `apps/studio/src/lib/db/accessDenied.ts:7` | yes - `accessDenied.spec.ts` `driver access-denied errors become DATABASE_ACCESS_DENIED` |
| F7 drop `@submit="save"` from the modal's `<base-modal>` | `apps/studio/src/components/sidebar/core/DatabaseColorModal.vue:4` | no - survived `databaseColorFlow.spec.ts` and the full `yarn vitest:unit`. Save would do nothing (C15, C16) |
| F8 drop `<DatabaseColorModal />` from `TableList` | `apps/studio/src/components/sidebar/core/TableList.vue:175` | no - survived `databaseColorFlow.spec.ts` and the full `yarn vitest:unit`. "Set color" would open nothing (C15, C16) |

## Ranked gaps

1. **Pressing Save in the color modal is unproven (F7).** This affects C15 and C16.
   - Where: `databaseColorFlow.spec.ts:38` stubs `BaseModal` as `<div><slot /></div>`, and `:53` calls `vm.save(...)` directly.
   - Fix: mount with a `BaseModal` stub that re-emits `submit`, or use the real `BaseModal`. Then submit the form, or the Save button, and assert the `setColor` payload.
   - Also add a `default` run through the modal to cover C16's half.
2. **The modal's mount in the sidebar is unproven (F8).** This affects C15 and C16.
   - Where: `TableList.vue:175`. No spec mounts `TableList`, or asserts that it renders `DatabaseColorModal`.
   - Fix: a shallow mount of `TableList` that finds `DatabaseColorModal` is enough.
3. **`checks.md` proof lines don't name the new tests.** This affects C7, C15, C16 and C19.
   - None of the following is cited by a `Proof:` line: `databaseColorFlow.spec.ts` (3 tests) and `accessDenied.spec.ts` `the utility lists inaccessible databases from the active client`.
   - A re-run driven by `checks.md` alone would skip them. They ran here only because the batch named them explicitly.
   - Fix: add them as proof lines.

Non-blocking observations:

- The F2 proof calls `watch.usedConfig.handler` on a hand-built context. `immediate: true` is not exercised, though the handler body is real.
- The F5 proof stubs `state(SID).connection`, so it covers the handler but not a real client. C1 covers the real Postgres client, so together they bridge door 2.
- The `plan.md` note on door 1 (`DEFAULT 0` vs `DEFAULT 1`) is additive, and it matches the migration at `20261016_create_database_labels.js:13`. That closes the Round 1 observation.
- C4 now has 5 cases, after a `toHaveLength(4)` guard on the 4 named codes. MariaDB's symbolic code is tested separately, as the claim allows.

## Gate

- `yarn vitest:unit <13 spec files> -t "<31 proof names + 4 added tests>" --reporter=verbose`: 13 files, 35 passed, 0 failed, 14 skipped (none is a proof). Exit 0, at 2fe15f81c.
- C1 `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts`: carried from bda383924 (2 passed, exit 0). No database code changed.
- C14 and C24 grep proofs: exit 0.
- `yarn vitest:unit` (full): 61 files, 2732 passed, 0 failed, 1 todo. Exit 0.
- `yarn test:unit` (full legacy Jest): 80 suites, 799 passed, 0 failed. Exit 0.
- Faults: 8 injected, 6 killed (F1-F6), 2 survived (F7, F8).

Gate outcome: every proof is green, and all of the Round 1 survivors are now killed. The color modal's submit binding and its mount are still unproven, which leaves C15 and C16 FAIL. **FAIL.**
