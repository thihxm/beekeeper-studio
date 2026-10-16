# Multi-database navigation verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 78f8c858d^..95636bfd0
**Round**: 5 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 5 is scoped to the fix commit `95636bfd0` (diff `b5388112c..95636bfd0` for this feature's files: tests only,
+5 cases in `apps/studio/tests/vitest/unit/components/tabDatabaseColumns.spec.ts`, +1 case in
`apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts`) and to the Round 4 FAIL (surviving mutants F4-F9).
Between `b5388112c` and `95636bfd0` the branch also carries 3 commits of `multi-database-polish`
(`a872950f2`, `9472c024e`, `c0db16139`). They are not judged here, but every proof ran at `95636bfd0` with them in
place, and the cited spec files they touched had their line numbers refreshed.

**All 38 checks are proven at `95636bfd0` and every Round 4 surviving mutant (F4-F9) is now killed**, as are F1-F3.
No proof regressed because of the polish commits. **The verdict is still FAIL because 2 new faults survive**
(F10, F11): the `provide` sites that hand `tabDatabase` to a tab's child components can be set to `null` with
every Vitest test green. F10 matters most. With `TabTableProperties.vue:174` set to `null`, the structure tab's
`TableSchema` runs `alterTable` through `TabDatabaseMixin`'s `connection` on the **default** database, and no test
fails. That means a DDL change made from a tab bound to `b` could go to `a`. The new tests stub `tabDatabase`
directly (`tabDatabaseColumns.spec.ts:130`, `:148`, `:170`), so they prove the consumers but not the wiring.

Profile `light`: no binding-source step, no Coverage recompute. Fault injection ran because the user asked for this
round after Round 4 failed on surviving mutants.

## Proof run (verified at 95636bfd0)

All commands ran from `apps/studio/` in the isolated worktree at `95636bfd0`.

- One batched VU invocation: `yarn vitest:unit <14 spec files> -t "<alternation of the 39 VU proof names + the
  tabDatabaseColumns describe + 3 databaseEntities regression tests>" --reporter=verbose`. Exit 0: **14 files,
  50 passed, 11 skipped**. Every proof name shows `✓` on its own line. Names with apostrophes were matched by
  substring (`loads columns of another database`, `columns load through the default connection`) or through the
  describe name. The 11 skips are tests outside the `-t` filter (mostly polish tests, plus
  `creates a non-active client once when two calls race`). None of them is a proof.
- C26 and C27 grep proofs ran verbatim: both exit 0, same output as Round 4.
- C18 re-ran (polish touched `multiDatabase.spec.ts`, `handlerState.ts`, `connHandlers.ts`):
  `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts --reporter=verbose` against a
  real postgres:16 container. Exit 0, **2 passed**: `lists tables of a non-active database` (the proof) and the
  polish test `lists databases the role cannot connect to`.
- Full `yarn vitest:unit`: exit 0, **57 files, 2713 passed, 0 failed, 1 todo** (Round 4: 52 files / 2689. The
  increase is +6 from the fix plus the polish specs).
- Full legacy Jest `yarn test:unit`: exit 0, **80 suites, 799 passed, 0 failed**.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | null / active db -> `state.connection`, 0 creates | batched VU, passed at 95636bfd0 | carried from e122bdff5 (file unchanged): `apps/studio/tests/vitest/unit/handlers/connectionFor.spec.ts:69` - `toBe(active)`; `:72` - `createConnection` x0 | PASS |
| C2 | 2 calls for `b` -> 1 create, 1 connect, same client | batched VU, passed at 95636bfd0 | carried from e122bdff5: `connectionFor.spec.ts:78` - `expect(first).toBe(second)`; `:80`, `:82` - x1 | PASS |
| C3 | connect rejects -> same error, `server.db["b"]` undefined | batched VU, passed at 95636bfd0 | carried from e122bdff5: `connectionFor.spec.ts:99` - `rejects.toBe(error)`; `:100` - `toBeUndefined()` | PASS |
| C4 | one client disconnect keeps tunnel, no shutdown | batched VU, passed at 95636bfd0 | carried from e122bdff5: `apps/studio/tests/vitest/unit/lib/db/serverClientCache.spec.ts:34` - `sshTunnel).not.toBeNull()`; `:35` | PASS |
| C5 | `conn/disconnect` disconnects 2/2 clients, tunnel null | batched VU, passed at 95636bfd0 | carried from e122bdff5: `connectionFor.spec.ts:118-120` | PASS |
| C6 | SurrealDB cached under `ns::db` | batched VU, passed at 95636bfd0 | carried from e122bdff5: `serverClientCache.spec.ts:43` - `toBe(first)`; `:44` | PASS |
| C7 | `forDatabase("b")` sends `database:"b"` on 4 calls; default sends none | batched VU, both passed at 95636bfd0 | carried from e122bdff5: `apps/studio/tests/vitest/unit/lib/utility/ElectronUtilityConnectionClient.spec.ts:27` - `toMatchObject({ database: "b" })`; `:37` - `not.toHaveProperty("database")` | PASS |
| C8 | `conn/listTables {database:"b"}` hits `server.db["b"]` only | batched VU, passed at 95636bfd0 | carried from e122bdff5: `connectionFor.spec.ts:107-108` | PASS |
| C9 | 2 dispatches -> 1 `conn/listTables` with `b`, loaded, `tablesFor("b")` | batched VU, passed at 95636bfd0 | verified at 95636bfd0: `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:44-47` | PASS |
| C10 | loading while pending, then error + driver message | batched VU, passed at 95636bfd0 | verified at 95636bfd0: `databaseEntities.spec.ts:58` - `"loading"`; `:63` - `"error"`; `:64` - driver message | PASS |
| C11 | store `disconnect` -> `databaseEntities` `{}` | batched VU, passed at 95636bfd0 | refreshed at 95636bfd0 (polish added a line above): `databaseEntities.spec.ts:76` - `toEqual({})` | PASS |
| C12 | 3 db rows, `a` expanded with tables, `b`/`c` collapsed | batched VU, passed at 95636bfd0 | refreshed at 95636bfd0 (polish added fixture lines, assertions unchanged): `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:109-110`, `:112-113` | PASS |
| C13 | expanding `b` dispatches load once; its schema and table rows render under `b` | batched VU, passed at 95636bfd0 | refreshed: `VirtualTableList.spec.ts:121-122`, `:134`, `:136` | PASS |
| C14 | loading indicator; error + retry re-dispatches `b` | batched VU, passed at 95636bfd0 | refreshed: `VirtualTableList.spec.ts:147`, `:155`, `:159-160` | PASS |
| C15 | collapse `a` -> 0 descendants | batched VU, passed at 95636bfd0 | refreshed: `VirtualTableList.spec.ts:167`, `:174` | PASS |
| C16 | `multipleDatabases` disabled -> 0 db rows, schemas top-level | batched VU, passed at 95636bfd0 | refreshed: `VirtualTableList.spec.ts:181`, `:183` | PASS |
| C17 | pin and hidden entity with `databaseName "b"` apply only under `b` | batched VU, passed at 95636bfd0 | refreshed: `VirtualTableList.spec.ts:199-202` | PASS |
| C18 | real Postgres: `connectionFor(sId,"b").listTables()` has `tb` not `ta`, active stays `a` | VI re-run at 95636bfd0 against a postgres:16 container, exit 0 | refreshed at 95636bfd0: `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:72-74` | PASS |
| C19 | limit 2, `b` LRU -> disconnect `b`, remove, then create `d` | batched VU, passed at 95636bfd0 | carried from e122bdff5: `apps/studio/tests/vitest/unit/handlers/clientLifecycle.spec.ts:78-83` | PASS |
| C20 | none idle -> rejects with message containing `"2"`, no create for `d` | batched VU, passed at 95636bfd0 | carried from e122bdff5: `clientLifecycle.spec.ts:92-93` | PASS |
| C21 | idle 5001 ms evicted, 4000 ms kept | batched VU, passed at 95636bfd0 | carried from e122bdff5: `clientLifecycle.spec.ts:108-111` | PASS |
| C22 | sweep and limit never evict active / reserved / in-transaction | batched VU, passed at 95636bfd0 | carried from e122bdff5: `clientLifecycle.spec.ts:126-132` | PASS |
| C23 | evicted `b` recreated and `listTables` resolves | batched VU, passed at 95636bfd0 | carried from e122bdff5: `clientLifecycle.spec.ts:139`, `:143-144` | PASS |
| C24 | after `conn/disconnect`, 10x sweep interval -> no disconnect | batched VU, passed at 95636bfd0 | carried from e122bdff5: `clientLifecycle.spec.ts:156-158` | PASS |
| C25 | limit and sweep eviction keep the tunnel | batched VU, passed at 95636bfd0 | carried from e122bdff5: `clientLifecycle.spec.ts:169-172` | PASS |
| C26 | `[db.default] maxOpenDatabases = 5`, `idleDatabaseTimeout = 600000`, both typed | grep verbatim at 95636bfd0, exit 0 | verified at 95636bfd0: `apps/studio/default.config.ini:113` - `maxOpenDatabases = 5`; `:117` - `idleDatabaseTimeout = 600000 ; 10 Minutes`; `bksConfig.d.ts` - 27 occurrences each | PASS |
| C27 | migration registered, `ALTER TABLE ... "databaseName" varchar NULL`, in both `pickable` | grep verbatim at 95636bfd0, exit 0 | verified at 95636bfd0: `apps/studio/src/migration/20261015_add_tab_database_name.js:5`; `apps/studio/src/migration/index.js:100`; `apps/studio/src/common/appdb/models/OpenTab.ts:11`; `apps/studio/src/common/transport/TransportOpenTab.ts:12` | PASS |
| C28 | table + table-properties from `b` -> `databaseName:"b"`, saved | batched VU, passed at 95636bfd0 | carried from e122bdff5: `apps/studio/tests/vitest/unit/store/tabDatabase.spec.ts:61`, `:66`. At the component level (AC 12), at 95636bfd0: `apps/studio/tests/vitest/unit/components/tabDatabaseColumns.spec.ts:94` (open/`initialize`, killed F4), `:122` (fields-changed reload, killed F5), `:38` (refresh, F1), `:52` (structure refresh, F2) | PASS |
| C29 | `connectionForTab` with `b` sends `database:"b"`; `null` -> default | batched VU, passed at 95636bfd0 | carried from e122bdff5: `tabDatabase.spec.ts:76` - `toMatchObject({ database: "b" })`; `:78` - `toBe(connection)`. Component consumers at 95636bfd0: `tabDatabaseColumns.spec.ts:142` (TableSchema submitApply, killed F6), `:158` (TableRelations getColumns, killed F7). The wiring that supplies `tabDatabase` to those consumers is unproven (F10, F11 survive; gap 1) | PASS |
| C30 | new query tab persists `databaseName:"a"` | batched VU, passed at 95636bfd0 | carried from e122bdff5: `tabDatabase.spec.ts:88` | PASS |
| C31 | after `changeDatabase("c")`, `b` tab still resolves and sends `b` | batched VU, passed at 95636bfd0 | carried from e122bdff5: `tabDatabase.spec.ts:102`, `:104`, `:107`. Component level: `tabDatabaseColumns.spec.ts:74-75` (FK navigation, F3a/F3b), `:173-175` (relations picker uses `tablesFor("b")`, killed F8/F8b/F8c) | PASS |
| C32 | `matches` false for `a` vs `b`; true for `null` vs default `a` | batched VU, passed at 95636bfd0 | carried from e122bdff5: `apps/studio/tests/vitest/unit/transport/TransportOpenTab.spec.ts:10`, `:13` | PASS |
| C33 | selector writes tab `databaseName`, next run sends it; selector `disabled` while transaction / reserved | batched VU, both passed at 95636bfd0 | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/QueryDatabaseSelector.spec.ts:48`, `:54`, `:64`, `:75`, `:79-80`, `:84` | PASS |
| C34 | transaction timeout rolls back on client `b`, not active | batched VU, passed at 95636bfd0 | carried from e122bdff5: `connectionFor.spec.ts:133-134` | PASS |
| C35 | tab bound to `b`, table missing in `b` -> not-found text | batched VU, passed at 95636bfd0 | refreshed at 95636bfd0 (polish added a state key): `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:34-35` | PASS |
| C36 | 1 table item whose title includes the database name and `orders`, plus 2 database items | batched VU, passed at 95636bfd0 | refreshed at 95636bfd0: `apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:25-27`, `:32` | PASS |
| C37 | table result emits `loadTable` with `database:"b"`; database result expands, 0 `changeDatabase` | batched VU, both passed at 95636bfd0 | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/QuickSearch.spec.ts:21`, `:28`, `:30` | PASS |
| C38 | query tab `databaseName "b"` shows `b` in header and selector; default `a` shows `a` | batched VU, both passed at 95636bfd0 | carried from e122bdff5: `QueryDatabaseSelector.spec.ts:35-38`; refreshed: `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:31`, `:34` | PASS |

## Faults injected

Isolation: a second worktree, `git worktree add --detach <scratchpad>/verify-r5-faults 95636bfd0`, with the
same 4 node_modules / ui-kit symlinks. The script applied one exact-line replacement and asserted the original
text was on the line Round 4 named. Narrowest covering spec per fault: `tabDatabaseColumns.spec.ts` for
F1-F8 and `databaseEntities.spec.ts` for F9. F10/F11 have no narrow covering spec, so they ran against the full
`tests/vitest/unit`. After each fault the script ran `git checkout -- src`. The scratch worktree was then
removed and pruned. `git status --porcelain` of `/Users/thiago/Dev/beekeeper-studio` and of the verify worktree
were byte-identical before and after.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 refresh -> `dispatch('updateTableColumns', this.table)` | `apps/studio/src/components/tableview/TableTable.vue:2164` | yes - `tabDatabaseColumns.spec.ts:38` (`TableTable refresh loads columns...`) |
| F2 structure refresh -> `updateTableColumns` | `apps/studio/src/components/TabTableProperties.vue:376` | yes - `tabDatabaseColumns.spec.ts:52` |
| F3a FK lookup `tablesFor(null)` | `apps/studio/src/mixins/fk_click.ts:81` | yes - `tabDatabaseColumns.spec.ts:74` |
| F3b FK payload without `database` | `apps/studio/src/mixins/fk_click.ts:149` | yes - `tabDatabaseColumns.spec.ts:75` |
| F4 open (`initialize`) -> `updateTableColumns` | `apps/studio/src/components/tableview/TableTable.vue:1166` | yes - `tabDatabaseColumns.spec.ts:94` (`opening a table tab loads columns...`) |
| F5 fields-changed reload -> `updateTableColumns` | `apps/studio/src/components/tableview/TableTable.vue:2052` | yes - `tabDatabaseColumns.spec.ts:122` |
| F6 schema tab submitApply -> `database: null` | `apps/studio/src/components/tableinfo/TableSchema.vue:410` | yes - `tabDatabaseColumns.spec.ts:142` |
| F7 relations column load -> `database: null` | `apps/studio/src/components/tableinfo/TableRelations.vue:323` | yes - `tabDatabaseColumns.spec.ts:158` |
| F8 relations `schemas` -> `$store.getters.schemas` | `apps/studio/src/components/tableinfo/TableRelations.vue:144` | yes - `tabDatabaseColumns.spec.ts:174` |
| F8b relations `schemaTables` -> `$store.getters.schemaTables` | `apps/studio/src/components/tableinfo/TableRelations.vue:147` | yes - `tabDatabaseColumns.spec.ts:175` |
| F8c relations `tables` -> `tablesFor(null)` | `apps/studio/src/components/tableinfo/TableRelations.vue:139` | yes - `tabDatabaseColumns.spec.ts:173` |
| F9 store null-db delegation -> bare `return` | `apps/studio/src/store/index.ts:770` (moved from :755 by polish) | yes - `databaseEntities.spec.ts:167-168` (`the default database's columns load through the default connection`) |
| F10 structure tab `provide` -> `tabDatabase: () => null` | `apps/studio/src/components/TabTableProperties.vue:174` | survived - full `vitest:unit` 2713 passed |
| F11 table tab `provide` -> `tabDatabase: () => null` | `apps/studio/src/components/tableview/TableTable.vue:356` | survived - full `vitest:unit` 2713 passed |

Round 4's F1-F9 sites are all killed, each by exactly 1 test, with the other 7 tests in the file still green.
F10 and F11 are new in this round. They are the step a fix that adds stubbed consumer tests leaves untested: the
new tests pass `tabDatabase: () => "b"` straight into the method context, so they cannot see whether the tab
actually provides it.

## Fix test review

- `tabDatabaseColumns.spec.ts:92` swallows `initialize`'s rejection (`.catch(() => undefined)`) because the
  context has no tabulator. The assertion at `:94` still fails under F4, so the swallow does not hide the
  regression. A future reorder that moved the dispatch after `tabulatorForTableData` would turn this test red,
  not green, which is the safe direction.
- The `databaseEntities.spec.ts:155-169` delegation test restores the end-to-end intent of the Round 3 Jest
  change: the default database's column re-fetch (#4567) goes through `conn/listTableColumns` without `database`
  and fills the default `tables` in place. Round 4 gap 2 is closed.
- All tests call component methods with a hand-built `this`, not mounted components. That is enough to kill
  F1-F9, but it is also why F10/F11 survive.

## Polish commits

The polish commits changed none of this feature's proof assertions. They added fixture keys
(`inaccessibleDatabases`, `databaseLabels`, `tooltip` directive) and new tests to 6 cited spec files, which moved
line numbers (refreshed above). They also changed the source in `store/index.ts`, `handlerState.ts`,
`connHandlers.ts`, `VirtualTableList.vue`, `TabWithTable.vue` and `SearchModule.ts`. Every proof, C18 against
real Postgres, both full suites and the moved F9 site are green or killed at `95636bfd0`. **No regression.**

## Ranked gaps

1. **`tabDatabase` provide wiring unproven (blocking; surviving mutants F10, F11).** Setting
   `TabTableProperties.vue:174` to `() => null` makes `TableSchema` / `TableRelations` / `TableIndexes` /
   `TablePartitions` (all on `TabDatabaseMixin`) use the default database's `connection`. So
   `TableSchema.submitApply`'s `alterTable` would run on the wrong database, and no test fails.
   `TableTable.vue:356` feeds `RowFilterBuilder` and `TableLength`, so it has lower impact. Fix: one test per
   provider asserting `provide.call({ tab: { databaseName: "b" } }).tabDatabase() === "b"`, or a shallow mount
   of `TabTableProperties` checking that a `TabDatabaseMixin` child's `connection` comes from
   `connectionFor("b")`.
2. **Component tests use hand-built contexts (non-blocking).** The fix's 8 cases prove each method's own
   behaviour. They do not prove that the mounted component has the `tab` / `tabDatabase` a real tab supplies.
   Gap 1 is the concrete case of this.

## Gate

- `yarn vitest:unit <14 proof files> -t "<39 proof names + 11 regression tests>" --reporter=verbose`: 50 passed, 0 failed, 11 skipped (none is a proof). Exit 0, at 95636bfd0.
- C26 and C27 grep proofs: exit 0, at 95636bfd0.
- `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts`: 2 passed. Exit 0, at 95636bfd0 (Docker postgres:16).
- `yarn vitest:unit` (full): 57 files, 2713 passed, 0 failed, 1 todo. Exit 0, at 95636bfd0.
- `yarn test:unit` (full legacy Jest): 80 suites, 799 passed, 0 failed. Exit 0, at 95636bfd0.
- Faults: 12/14 killed. Round 4's F1-F9 (incl. F8b/F8c) are all killed. The new F10 and F11 survive.

Gate outcome: every proof, both full suites, C18 and both greps are green at 95636bfd0, and Round 4's blocking
gaps are closed. The feature is not done because of surviving mutants F10/F11 (gap 1). Round 5 is past the
three-round bound, so the decision goes to the user. Gap 1 needs 2 small tests.

Non-blocking observations (carried from Round 3, not re-judged): routines failures are only logged; a `force`
reload can receive older routines that were still in flight; `updateDatabaseTableColumns` drops columns when the
table is not in `databaseEntities[database]` (`store/index.ts:776-778`); `queryClients` leaks on query ids that
never execute; C33/C38 prop forwarding is shown by citation only.
