# Multi-database polish verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: a872950f2^..8fe345e19
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 3 (at `36985db8c`) failed on one item: Test policy row 1 was unmet for `sqlserver.ts`, which had no boundary proof. This round is scoped to the fix (`36985db8c..8fe345e19`) and to that verdict.

- The new SQL Server boundary proof ran against a real SQL Server 2019 container and passed.
- Two faults in the SQL Server query were each killed by that proof, and each failed a different assertion.
- The tab-close change has three proofs, one each for the cross-database, view and non-match cases. Three faults on the close path were each killed, each at a different assertion.
- All proofs were re-run at `8fe345e19`, and every check is proven. Row 1 is now met.

What this round re-did, and what it carried:

- **Re-run at 8fe345e19:** every proof, including C1 against Postgres (run again although no database code changed) and the new C2 VI proof.
- **Refreshed:** citations for the files the fix touched (`revealActiveEntity.spec.ts`, the new `sqlserverInaccessible.spec.ts`, `sidebarKey.ts`, `CoreTabs.vue`).
- **Recomputed:** the Coverage rows whose authority the fix touched.
- **Re-judged:** Test policy rows 1, 2 and 3, the rows that classify a touched file.
- **Carried from 36985db8c:** the other Coverage rows and citations, since the fix did not touch those files.

**Intermediate commit.** At `857aab69e` the legacy Jest suite was red: 3 tests in `tests/unit/components/CoreTabsClose.spec.ts` failed.

- The cause: `close` called `this.clearSidebarSelectionFor(tab)` and read `this.$store.state.database`. The hand-built `this` context in that spec had neither.
- `8fe345e19` fixed it with the pure `closedTabWasSelected` helper, and the fixture gained `$store.state: { database: null }`.
- I judge the fixture change to be **fixture completeness, not a weakened assertion**:
  - no assertion in that spec changed (`git diff 36985db8c..8fe345e19 -- tests/unit/components/CoreTabsClose.spec.ts` is the single fixture line);
  - the real store always has `state.database`;
  - the spec's tabs have no `tableName`, so `sidebarKeyForTab` returns `null` and the selection branch is inert there either way.
- At HEAD the full Jest suite is green.

## Proof run (verified at 8fe345e19)

All commands ran from `apps/studio/` in the main checkout, on a clean tree.

- **Batched VU, one invocation:** `yarn vitest:unit` with the 13 proof spec files, `-t "<the 37 distinct proof names from checks.md plus 'clears the selection of a closed tab in another database', as one alternation>"` and `--reporter=verbose`.
  - Result: exit 0. **13 files, 38 passed, 14 skipped.**
  - I scripted a check of each of the 38 names against the `✓` lines of the output. Every name has its own `✓` line, and none is missing.
- **C1:** `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists databases the role cannot connect to" --reporter=verbose`.
  - Result: exit 0, `✓ ... lists databases the role cannot connect to`. The run took 1 passed and 1 skipped; the skipped test belongs to the sibling feature.
  - It ran against real Postgres.
- **C2 VI (new):** `yarn vitest:integration tests/vitest/integration/lib/db/sqlserverInaccessible.spec.ts --reporter=verbose`.
  - Result: exit 0, `✓ ... SQL Server databases the login cannot open > sql server lists databases the login has no access to`. 1 passed.
  - It ran against the real `mcr.microsoft.com/mssql/server:2019-latest` testcontainer.
- **C14 grep (verbatim):** exit 0.
  - `src/migration/20261016_create_database_labels.js:16` holds the index.
  - `src/migration/index.js:101` holds the import.
- **C24 grep (verbatim):** exit 0.
  - `default.config.ini:84` reads `revealActiveEntity = true`.
  - `bksConfig.d.ts` has a count of 1.
- **Full `yarn vitest:unit`:** exit 0. **61 files, 2735 passed, 1 todo, 0 failed.** That is one more test than Round 3, the new close test.
- **Full legacy Jest `yarn test:unit`:** exit 0. **80 suites, 799 passed, 0 failed.**

## Checks

Verified at 8fe345e19. Every proof was re-run. Citations in files the fix touched were refreshed; the others are carried from 36985db8c, and their files are unchanged in the fix.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | A role without CONNECT gets a list that contains `secret` and not `a` | VI exit 0, `✓` | `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:86` - `expect(inaccessible).toContain("secret")`. `:87` - `expect(inaccessible).not.toContain("a")` | PASS |
| C2 | SQL Server SQL contains `HAS_DBACCESS(name) = 0` and returns the names | Batched VU `✓` + VI exit 0 `✓` (real SQL Server 2019) | `apps/studio/tests/vitest/unit/lib/db/inaccessibleDatabases.spec.ts:16` - `toContain('HAS_DBACCESS(name) = 0')`. `:18` - `expect(names).toEqual(['finance', 'hr'])`. Boundary: `apps/studio/tests/vitest/integration/lib/db/sqlserverInaccessible.spec.ts:64` - `expect(inaccessible).toContain("secret")`. `:65` - `not.toContain("open_db")`. `:66` - `not.toContain("master")`. SQL at `src/lib/db/clients/sqlserver.ts:727` | PASS |
| C3 | A client without an override returns `[]` | Batched VU `✓` | `inaccessibleDatabases.spec.ts:26` - `expect(await client.listInaccessibleDatabases()).toEqual([])` | PASS |
| C4 | The 4 driver errors become `DATABASE_ACCESS_DENIED` | Batched VU `✓` | `apps/studio/tests/vitest/unit/handlers/accessDenied.spec.ts:43` - `expect(cases).toHaveLength(4)`. `:49` - `expect(rejected.code).toBe(DATABASE_ACCESS_DENIED)` per case | PASS |
| C5 | A 28P01 error is rethrown as the same object | Batched VU `✓` | `accessDenied.spec.ts:60` - `expect(rejected).toBe(error)`. `:61` - `expect(rejected.code).toBe("28P01")` | PASS |
| C6 | The utility's `errorCode` becomes `err.code` | Batched VU `✓` | `apps/studio/tests/vitest/unit/lib/utility/UtilityConnection.spec.ts:20` - `toBeInstanceOf(Error)`. `:22` - `expect(rejected.code).toBe("DATABASE_ACCESS_DENIED")` | PASS |
| C7 | The list gives `["secret"]`. On a reject it gives `[]`, and the database list is still committed | Batched VU `✓` (2 proofs) | `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:130` - `toEqual(["secret"])`. `:138` - `toEqual([])`. `:139` - `databaseList).toEqual(["a", "b", "c"])`. `accessDenied.spec.ts:68` - the handler returns `["secret"]` | PASS |
| C8 | Access denied on load locks `b` | Batched VU `✓` | `databaseEntities.spec.ts:152` - `expect(store.state.inaccessibleDatabases).toContain("b")` | PASS |
| C9 | Class, icon, aria-disabled and tabindex are set, and nothing loads | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:211-214` - `locked`, `.lock-icon`, `aria-disabled` `"true"`, `tabindex` `"0"`. `:218` - `loadDatabaseEntities).toHaveBeenCalledTimes(0)` | PASS |
| C10 | Tooltip text with and without a username, trigger `hover focus` | Batched VU `✓` | `VirtualTableList.spec.ts:230` - `__tooltip).toEqual({...`, with `:232` `trigger: "hover focus"`. `:239` - content without a username | PASS |
| C11 | After a clear, `inaccessibleDatabases` is `[]` | Batched VU `✓` | `databaseEntities.spec.ts:77` - `toEqual([])` | PASS |
| C12 | A locked database has 0 index items | Batched VU `✓` | `apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:39` - `expect(fromWarehouse).toHaveLength(0)` | PASS |
| C13 | A tab on locked `b` shows the message and no table slot | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:58` - `toContain("No permission to access database b with the current account")`. `:59` - `.table-slot` exists is `false` | PASS |
| C14 | Unique index, and 2 saves leave 1 row holding the second color | grep exit 0, batched VU `✓` | `apps/studio/src/migration/20261016_create_database_labels.js:16` - `CREATE UNIQUE INDEX ...`. `apps/studio/tests/vitest/unit/common/appdb/databaseLabels.spec.ts:21` - `toHaveLength(1)`. `:22` - `color).toBe('purple')` | PASS |
| C15 | Choosing purple dispatches the save, and the bar has the purple class | Batched VU `✓` (5 proofs) | `apps/studio/tests/vitest/unit/components/databaseColorFlow.spec.ts:26` - the menu entry opens the modal. `:69` - `setColor.mock.calls[0][1]).toEqual({ databaseName: "b", color: "purple" })`. `:104` - `TableList` mounts the modal. `apps/studio/tests/vitest/unit/store/databaseLabels.spec.ts:33` - `appdb/databaseLabels/setColor`. `VirtualTableList.spec.ts:248` - `connection-label-color-purple` | PASS |
| C16 | Choosing default sends remove, and the bar has no color class | Batched VU `✓` (3 proofs) | `databaseColorFlow.spec.ts:79` - `{ databaseName: "b", color: "default" }`. `databaseLabels.spec.ts:46` - `appdb/databaseLabels/remove`. `VirtualTableList.spec.ts:249` - no color class | PASS |
| C17 | Stripe and badge are purple on `b` and green on the default | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:40-41` - purple. `:44-45` - green | PASS |
| C18 | An unsaved connection updates the store and sends 0 label requests | Batched VU `✓` | `databaseLabels.spec.ts:54` - `toBe("purple")`. `:55` - label requests `toHaveLength(0)` | PASS |
| C19 | `load` sends find with the `where` clause, and the connect watcher calls it | Batched VU `✓` (2 proofs) | `databaseLabels.spec.ts:62` - `toHaveBeenCalledWith("appdb/databaseLabels/find", { options: { where: { connectionId: 3, workspaceId: -1 } } })`. `databaseColorFlow.spec.ts:114` - `dispatch).toHaveBeenCalledWith("databaseLabels/load")` | PASS |
| C20 | Keys `b::table.public.users` and `table.public.users`, and the header commits the key | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/revealActiveEntity.spec.ts:74` - `toBe("b::table.public.users")`. `:75` - `toBe("table.public.users")`. `:85` - `commit).toHaveBeenCalledWith("selectSidebarItem", "b::table.public.users")`. `:86` - `AppEvent.revealSidebarItem` (refreshed: a new import moved each line by +1) | PASS |
| C21 | The view key is `view.public.v` | Batched VU `✓` | `revealActiveEntity.spec.ts:91` - `toBe("view.public.v")` | PASS |
| C22 | With reveal on, selecting expands `b` and its schema, loads `b`, and scrolls to the index | Batched VU `✓` | `revealActiveEntity.spec.ts:134` - `b().expanded).toBe(true)`. `:136` - `{ database: "b", force: false }`. `:144` - `target.parent.expanded).toBe(true)`. `:147` - `scrollToIndex).toHaveBeenCalledWith(index)` (refreshed) | PASS |
| C23 | With reveal off, nothing expands and nothing scrolls | Batched VU `✓` | `revealActiveEntity.spec.ts:158` - `toEqual(before)`. `:159` - `scrollToIndex).toHaveBeenCalledTimes(0)` (refreshed) | PASS |
| C24 | The ini declares `revealActiveEntity = true`, and it is typed | grep exit 0 | `apps/studio/default.config.ini:84` - `revealActiveEntity = true`. `apps/studio/src/typings/bksConfig.d.ts:590` - `revealActiveEntity: boolean;` | PASS |
| C25 | 3 entries with all 3 fields each | Batched VU `✓` | `apps/studio/tests/vitest/unit/services/pluginDatabases.spec.ts:48` - `expect(service.getDatabases()).toEqual([...])` (`:48-52`) | PASS |
| C26 | With `multipleDatabases` disabled, the result is `[]` | Batched VU `✓` | `pluginDatabases.spec.ts:57` - `toEqual([])` | PASS |
| C27 | `database: "b"` is sent, and omitting it sends no key | Batched VU `✓` | `pluginDatabases.spec.ts:70` - `toMatchObject({ queryText: "select 1", database: "b" })`. `:75` - `not.toHaveProperty("database")` | PASS |
| C28 | A query tab gives `b`, or the default `a`. A table tab resolves `b`'s orders | Batched VU `✓` | `pluginDatabases.spec.ts:93` - `b`. `:94` - `a`. `:97` - `table.databaseName).toBe("b")`. `:98` - `data.table).toBe(ordersB)` | PASS |
| C29 | Connection info keeps the default `a` | Batched VU `✓` | `pluginDatabases.spec.ts:103` - `getConnectionInfo().databaseName).toBe("a")` | PASS |
| C30 | The bridge routes `getDatabases` and the `runQuery` database | Batched VU `✓` | `pluginDatabases.spec.ts:119` - `getDatabases).toHaveBeenCalledTimes(1)`. `:124` - `runQuery).toHaveBeenCalledWith("select 1", "b")` | PASS |
| C31 | Disconnected gives the noDatabase message | Batched VU `✓` | `pluginDatabases.spec.ts:62` - `toThrow("No database connection found")` | PASS |
| C32 | A locked database gives code `DATABASE_ACCESS_DENIED` | Batched VU `✓` | `pluginDatabases.spec.ts:87` - `expect(rejected.code).toBe("DATABASE_ACCESS_DENIED")` | PASS |

## Coverage

The fix touched two authorities, and those rows were recomputed at 8fe345e19:

- the SQL Server privilege listing (it gained a boundary proof);
- the consumers of the selection key (`CoreTabs.close` became a new consumer of `sidebarKeyForTab`, and `closedTabWasSelected` added a match/no-match decision).

The other rows are **carried from 36985db8c**, because their authorities (code, plan) are unchanged in the fix.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| privilege listing per dialect (3) - recomputed | `postgresql.ts` and `sqlserver.ts:723-731` overrides, `BasicDatabaseClient.ts` default | Postgres family C1 (real database) · SQL Server C2 at its own layer (`inaccessibleDatabases.spec.ts:16`) and at the boundary (`sqlserverInaccessible.spec.ts:64-66`) · default C3 | - |
| SQL Server listing outcomes at the boundary (3) *(new)* - recomputed | `HAS_DBACCESS` semantics: no-access database, mapped database, system database the login reaches | `secret` listed (`:64`) · `open_db` not listed (`:65`) · `master` not listed (`:66`) | - |
| selection key consumers (3) *(new)* - recomputed | `rg sidebarKeyForTab src`: `CoreTabHeader` (commit), the reveal in `VirtualTableList`, `closedTabWasSelected` from `CoreTabs.close` | header commit C20 (`revealActiveEntity.spec.ts:85`) · tree reveal C22 (`:133-147`) · close clears the selection: `revealActiveEntity.spec.ts:112` (another database), `:117` (a view's structure tab) | - |
| `closedTabWasSelected` decision (2) *(new)* - recomputed | `src/common/sidebarKey.ts:18-25` | match clears (`revealActiveEntity.spec.ts:112`, `:117`) · no match keeps the selection (`:122`) | - |
| selection key parts (2) - recomputed | `src/common/sidebarKey.ts:13-14` (unchanged) | prefix on and off C20 (`:74-75`) · entity type C21 (`:91`) | - |
| Landing doors (5) - carried from 36985db8c | `plan.md` Landing | door 1 C14 · door 2 C1, C2 (now also a boundary proof), C7 · door 3 C4 · door 4 C24 · door 5 C25, C27, C28, C30 | - |
| Relations constraint (1) - carried from 36985db8c | `plan.md` Relations | C14 | - |
| driver access-denied codes (5) - carried from 36985db8c | `plan.md` door 3 against `accessDenied.ts:7` | C4, table-driven over 4 named cases plus the symbolic case | - |
| lock sources and branches (3) - carried from 36985db8c | `src/store/index.ts` | C7 ×2 · C8 | - |
| locked node attributes (4 + no-load) - carried from 36985db8c | AC 9 | C9 | - |
| tooltip (2 triggers, 2 texts) - carried from 36985db8c | AC 10 | C10 | - |
| places a lock shows (4) - carried from 36985db8c | `plan.md` Flow | C9 · C12 · C13 · C25 | - |
| color places (4) - carried from 36985db8c | `plan.md` Flow | C15/C16 · C17 ×2 · C25 | - |
| `DatabaseLabelModule.setColor` branches (3) - carried from 36985db8c | `DatabaseLabelModule.ts` | C16 · C18 · C15 | - |
| color wiring hops (4) - carried from 36985db8c | Test policy evidence | `databaseColorFlow.spec.ts:26`, `:61-62`, `:66-69`, `:104` | - |
| reveal config values (2) - carried from 36985db8c | AC 22/23 | C22 · C23 | - |
| `getDatabases` outcomes (3) - carried from 36985db8c | `plan.md` Surface | C25 · C26 · C31 | - |
| `runQuery` outcomes (3) - carried from 36985db8c | `plan.md` Surface | C27 ×2 · C32 | - |
| plugin tab serialization (2×2) - carried from 36985db8c | `plan.md` Surface | C28 | - |
| plugin bridge routes (2) - carried from 36985db8c | door 5, `WebPluginLoader.ts` | C30 | - |
| error-code transport hops (3) - carried from 36985db8c | `plan.md` Flow | C4 · C6 · C8 | - |
| startup config: revealActiveEntity (2 assemblies) - carried from 36985db8c | read directly | `default.config.ini:84` · `bksConfig.d.ts:590` | - |
| startup assembly: appdb entity and migration (2) - carried from 36985db8c | read directly | `Connection.ts:39` · `migration/index.js:101` | - |

## Test policy rows

Rows 1-3 were re-judged at 8fe345e19: row 1 because it was unmet, rows 2 and 3 because they classify touched files. Row 4 is carried from 36985db8c.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `accessDenied.ts` + `handlerState.connectionFor` · `postgresql.ts` · `sqlserver.ts` · `DatabaseLabelModule.setColor` · `PluginStoreService.ts` | own layer and boundary for each: access-denied C4/C5 + C6 · Postgres C1 · **SQL Server: own layer C2 (`inaccessibleDatabases.spec.ts:16-18`) + boundary C2 VI against a real SQL Server 2019 (`sqlserverInaccessible.spec.ts:64-66`)** · labels C15/C16/C18 + appdb C14 · plugin C25-C29 + bridge C30-C32 | yes - the boundary proof asserts the contract: a database the login cannot open is listed, while a mapped user database and a system database are excluded. F1 and F5 below show it turns red under a flipped or removed `HAS_DBACCESS` filter |
| Decides, not reached across a boundary | store lock logic · `VirtualTableList.vue` node · `DatabaseLabel.setColor` · `src/common/sidebarKey.ts` (`sidebarKeyForTab` + new `closedTabWasSelected`) · `SearchModule.ts` · `TabWithTable.vue` · `CoreTabHeader.vue` | one asserted case per decision row. `closedTabWasSelected` has 2 rows: match (`revealActiveEntity.spec.ts:112`, `:117`) and no match (`:122`). The rest are as Round 3 | yes |
| Wiring that decides nothing | `Item.vue` props · `CoreTabHeader` → `revealSidebarItem` · `CoreInterface` → `databaseLabels/load` · `DatabaseColorModal` `@submit` · its mount in `TableList.vue` · the menu entry · **`CoreTabs.close` → `closedTabWasSelected(tab, selectedSidebarItem, $store.state.database)`** | each exercised once from its trigger. The new hop runs through the real `CoreTabs` `close` method (`revealActiveEntity.spec.ts:96`, `close.call(ctx, tab)` at `:111`). F2 and F4 show it fails with the old key or a dropped default-database argument | yes |
| Instrumentation (carried from 36985db8c) | `conn/listInaccessibleDatabases` handler · `ElectronUtilityConnectionClient.listInaccessibleDatabases` | none, covered by C7 | yes |

## Faults injected

Verified at 8fe345e19. Faults were injected only on the surfaces the fix touched or created, 5 in all, which is the cap. Round 3's 5 faults (all killed) sit on surfaces the fix did not touch, so they are not repeated.

**Isolation.**

- Worktree: `git worktree add --detach /private/tmp/claude-503/verify-polish-r4 8fe345e19`.
- Symlinks to the main checkout's root, `apps/studio` and `apps/ui-kit` `node_modules`, and to `apps/ui-kit/dist`.

**Method.**

- A script applied each fault as one exact-substring replacement, asserting a single match.
- It ran the narrowest covering spec on the whole file.
- It then ran `git checkout -- <file>` and asserted that the tracked tree was clean.

**Cleanup.**

- The symlinks were removed first, then the worktree with `git worktree remove --force`, then `git worktree prune`.
- The main tree's `git status --porcelain` was empty before and after; the two were diffed and are identical.
- The main `node_modules` is intact.
- No SQL Server container was left running.

Each fault failed a **different assertion**.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `WHERE HAS_DBACCESS(name) = 0` → `= 1` | `apps/studio/src/lib/db/clients/sqlserver.ts:727` | yes - VI `sqlserverInaccessible.spec.ts:64` failed: `expected [ 'master', 'msdb', 'open_db', …(1) ] to include 'secret'` |
| F5 `WHERE HAS_DBACCESS(name) = 0` → `WHERE 1 = 1` (the access filter dropped) | `apps/studio/src/lib/db/clients/sqlserver.ts:727` | yes - VI `sqlserverInaccessible.spec.ts:65` failed: `expected [ 'master', 'model', 'msdb', …(3) ] to not include 'open_db'` |
| F2 `CoreTabs.close` back to the old key, `` `${tabType}.${schemaName}.${tableName}` === this.selectedSidebarItem `` | `apps/studio/src/components/CoreTabs.vue:1056` | yes - `revealActiveEntity.spec.ts:112` (the other-database case) failed |
| F3 `closedTabWasSelected` returns `!!key` (the comparison with the selection dropped) | `apps/studio/src/common/sidebarKey.ts:24` | yes - `revealActiveEntity.spec.ts:122` failed: another table must stay selected |
| F4 the default database passed as `null` instead of `this.$store.state.database` | `apps/studio/src/components/CoreTabs.vue:1056` | yes - `revealActiveEntity.spec.ts:117` failed: the view in default `a` built `a::view.public.v` |

## Ranked gaps

None blocking.

Non-blocking observations:

1. **The close behaviour has no numbered check.** Clearing the selection on close is recorded in the `checks.md` Handoff ("Settled after round 3") with its covering test, but it has no C-number. It is proven and mutation-tested here (F2-F4). Promoting it to a check would put it in the check table instead of only the Handoff.
2. **The legacy Jest fixture now carries `$store.state: { database: null }`.** This is fixture completeness: no assertion changed, and the selection branch is inert there because its tabs have no `tableName`. The suite was red at the intermediate commit `857aab69e` and green at HEAD.
3. **The `!!key` guard in `closedTabWasSelected` is never asserted.** With a `null` key and a `null` selection, it stops a no-op `selectSidebarItem(null)` commit. The mutant would be functionally equivalent, so no fault was spent on it.
4. **Carried from Round 3, still open:**
   - the Postgres subclasses' inherited privilege query is unproven, but fails safe;
   - the `originalError.number` lookup in `accessDenied.ts:16` is never asserted;
   - the unsaved-connection branch of `DatabaseLabelModule.load` is never asserted;
   - some wiring proofs call handlers directly;
   - C14's entity test exercises the entity `@Index`, not the migration.

## Gate

- `yarn vitest:unit <13 spec files> -t "<38 names>" --reporter=verbose`: 13 files, 38 passed, 0 failed, 14 skipped (none is a proof). Exit 0.
- `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists databases the role cannot connect to"`: 1 passed. Exit 0.
- `yarn vitest:integration tests/vitest/integration/lib/db/sqlserverInaccessible.spec.ts`: 1 passed. Exit 0.
- C14 and C24 grep proofs: exit 0.
- `yarn vitest:unit` (full): 61 files, 2735 passed, 1 todo, 0 failed. Exit 0.
- `yarn test:unit` (full legacy Jest): 80 suites, 799 passed, 0 failed. Exit 0.
- Faults: 5 injected, 5 killed.

Gate outcome: 32/32 checks proven, 0 coverage members unproven, 5/5 faults killed, and all 4 Test policy rows met. **PASS.**
