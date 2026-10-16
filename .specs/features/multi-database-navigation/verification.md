# Multi-database navigation verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 78f8c858d^..b5388112c
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 4 is scoped to the fix diff `7173ae90b..b5388112c` and to the two Round 3 findings: the red legacy Jest
test (gap 1, blocking) and AC 12 / AC 14 proven only below the component boundary (gap 2). The fix touches 3
code/test files: `apps/studio/src/components/tableinfo/TableRelations.vue` (+8/-1),
`apps/studio/tests/unit/components/tableview/TableTable.spec.ts` (1 assertion), and the new
`apps/studio/tests/vitest/unit/components/tabDatabaseColumns.spec.ts` (3 tests). No file that a check's evidence
cites changed, so evidence citations carry from e122bdff5 / 7173ae90b; **every proof re-ran at `b5388112c`**.

All 38 checks are proven at `b5388112c`, and the Round 3 regression is closed: `yarn test:unit` (Jest) and
`yarn vitest:unit` are both green. **The verdict is FAIL because fault injection on the fix's surfaces leaves 6
surviving mutants** (verify.md, "What fails the feature": a surviving mutant). The most serious is F4: reverting
`TableTable.vue:1166` (`initialize`, the path a newly opened table tab runs - the exact manual-test bug "tables of
a non-default database don't open") keeps every Vitest and Jest test green. The new tests kill 3 of the fix's 7
sites (refresh, structure refresh, FK navigation).

Profile `light`: no binding-source step, no Coverage recompute. Fault injection was run on the fix's surfaces
because the brief asked whether the new tests fail if the fix is reverted.

## Proof run (verified at b5388112c)

- One batched VU invocation from `apps/studio/` in the isolated worktree at `b5388112c`:
  `yarn vitest:unit <14 spec files> -t "<alternation of all 39 proof names + 2 Round 2 risk tests + 2 Round 3 fix tests + 3 Round 4 tests>" --reporter=verbose`.
  Exit 0: 14 files, **46 passed, 1 skipped**. Every proof name shows `✓` on its own line. The apostrophe tests were
  matched by substring (`loads columns of another database`, `TableTable refresh loads columns from the tab`, ...).
  The skip is `connectionFor > creates a non-active client once when two calls race` (not a proof; same as Round 3).
- C26 and C27 grep proofs run verbatim from `apps/studio/`: both exit 0, same output as Round 3.
- C18 (VI, docker postgres) **not re-run**: `git diff --stat e122bdff5..b5388112c -- src/handlers src/lib src-commercial tests/vitest/integration`
  is empty. Carried from e122bdff5.
- Full `yarn vitest:unit`: exit 0, **52 files, 2689 passed, 0 failed, 1 todo** (Round 3: 51 files / 2686; +1 file, +3 tests).
- Full legacy Jest `yarn test:unit`: exit 0, **80 suites, 799 passed, 0 failed**.
  `PASS tests/unit/components/tableview/TableTable.spec.ts`.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | null / active db -> `state.connection`, 0 creates | batched VU, passed at b5388112c | carried from e122bdff5 (untouched by the fix): `apps/studio/tests/vitest/unit/handlers/connectionFor.spec.ts:69` - `toBe(active)`; `:72` - `createConnection).toHaveBeenCalledTimes(0)` | PASS |
| C2 | 2 calls for `b` -> 1 create, 1 connect, same client | batched VU, passed at b5388112c | carried from e122bdff5: `connectionFor.spec.ts:78` - `expect(first).toBe(second)`; `:80`, `:82` - x1 | PASS |
| C3 | connect rejects -> same error, `server.db["b"]` undefined | batched VU, passed at b5388112c | carried from e122bdff5: `connectionFor.spec.ts:99` - `rejects.toBe(error)`; `:100` - `toBeUndefined()` | PASS |
| C4 | one client disconnect keeps tunnel, no shutdown | batched VU, passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/lib/db/serverClientCache.spec.ts:34` - `sshTunnel).not.toBeNull()`; `:35` | PASS |
| C5 | `conn/disconnect` disconnects 2/2 clients, tunnel null | batched VU, passed at b5388112c | carried from e122bdff5: `connectionFor.spec.ts:118-120` | PASS |
| C6 | SurrealDB cached under `ns::db` | batched VU, passed at b5388112c | carried from e122bdff5: `serverClientCache.spec.ts:43` - `toBe(first)`; `:44` | PASS |
| C7 | `forDatabase("b")` sends `database:"b"` on 4 calls; default sends none | batched VU, both passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/lib/utility/ElectronUtilityConnectionClient.spec.ts:27` - `toMatchObject({ database: "b" })`; `:37` - `not.toHaveProperty("database")` | PASS |
| C8 | `conn/listTables {database:"b"}` hits `server.db["b"]` only | batched VU, passed at b5388112c | carried from e122bdff5: `connectionFor.spec.ts:107-108` | PASS |
| C9 | 2 dispatches -> 1 `conn/listTables` with `b`, loaded, `tablesFor("b")` | batched VU, passed at b5388112c | carried from 7173ae90b (spec untouched by this fix): `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:44-47` | PASS |
| C10 | loading while pending, then error + driver message | batched VU, passed at b5388112c | carried from 7173ae90b: `databaseEntities.spec.ts:58` - `"loading"`; `:63` - `"error"`; `:64` - driver message | PASS |
| C11 | store `disconnect` -> `databaseEntities` `{}` | batched VU, passed at b5388112c | carried from 7173ae90b: `databaseEntities.spec.ts:75` - `toEqual({})` | PASS |
| C12 | 3 db rows, `a` expanded with tables, `b`/`c` collapsed | batched VU, passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:92`, `:95` | PASS |
| C13 | expanding `b` dispatches load once; its schema and table rows render under `b` | batched VU, passed at b5388112c | carried from e122bdff5: `VirtualTableList.spec.ts:105-106`, `:118`, `:120` | PASS |
| C14 | loading indicator; error + retry re-dispatches `b` | batched VU, passed at b5388112c | carried from e122bdff5: `VirtualTableList.spec.ts:131`, `:139`, `:143-144` | PASS |
| C15 | collapse `a` -> 0 descendants | batched VU, passed at b5388112c | carried from e122bdff5: `VirtualTableList.spec.ts:151`, `:158` | PASS |
| C16 | `multipleDatabases` disabled -> 0 db rows, schemas top-level | batched VU, passed at b5388112c | carried from e122bdff5: `VirtualTableList.spec.ts:165`, `:167` | PASS |
| C17 | pin and hidden entity with `databaseName "b"` apply only under `b` | batched VU, passed at b5388112c | carried from e122bdff5: `VirtualTableList.spec.ts:183-186` | PASS |
| C18 | real Postgres: `connectionFor(sId,"b").listTables()` has `tb` not `ta`, active stays `a` | not re-run: no change under `src/handlers`, `src/lib`, `src-commercial` or `tests/vitest/integration` between e122bdff5 and b5388112c (empty `git diff --stat`) | carried from e122bdff5 (VI passed against a real postgres container): `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:65-67` | PASS |
| C19 | limit 2, `b` LRU -> disconnect `b`, remove, then create `d` | batched VU, passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/handlers/clientLifecycle.spec.ts:78-83` | PASS |
| C20 | none idle -> rejects with message containing `"2"`, no create for `d` | batched VU, passed at b5388112c | carried from e122bdff5: `clientLifecycle.spec.ts:92-93` | PASS |
| C21 | idle 5001 ms evicted, 4000 ms kept | batched VU, passed at b5388112c | carried from e122bdff5: `clientLifecycle.spec.ts:108-111` | PASS |
| C22 | sweep and limit never evict active / reserved / in-transaction | batched VU, passed at b5388112c | carried from e122bdff5: `clientLifecycle.spec.ts:126-132` | PASS |
| C23 | evicted `b` recreated and `listTables` resolves | batched VU, passed at b5388112c | carried from e122bdff5: `clientLifecycle.spec.ts:139`, `:143-144` | PASS |
| C24 | after `conn/disconnect`, 10x sweep interval -> no disconnect | batched VU, passed at b5388112c | carried from e122bdff5: `clientLifecycle.spec.ts:156-158` | PASS |
| C25 | limit and sweep eviction keep the tunnel | batched VU, passed at b5388112c | carried from e122bdff5: `clientLifecycle.spec.ts:169-172` | PASS |
| C26 | `[db.default] maxOpenDatabases = 5`, `idleDatabaseTimeout = 600000`, both typed | grep verbatim at b5388112c, exit 0 | verified at b5388112c: `apps/studio/default.config.ini:113` - `maxOpenDatabases = 5`; `:117` - `idleDatabaseTimeout = 600000 ; 10 Minutes`; `bksConfig.d.ts` - 27 occurrences each | PASS |
| C27 | migration registered, `ALTER TABLE ... "databaseName" varchar NULL`, in both `pickable` | grep verbatim at b5388112c, exit 0 | verified at b5388112c: `apps/studio/src/migration/20261015_add_tab_database_name.js:5`; `apps/studio/src/migration/index.js:100`; `apps/studio/src/common/appdb/models/OpenTab.ts:11`; `apps/studio/src/common/transport/TransportOpenTab.ts:12` | PASS |
| C28 | table + table-properties from `b` -> `databaseName:"b"`, saved | batched VU, passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/store/tabDatabase.spec.ts:61`, `:66`. Re-judged at b5388112c (AC 12): the tab from `b` now has component-level proof that its column loads go to `b` - `apps/studio/tests/vitest/unit/components/tabDatabaseColumns.spec.ts:35` (TableTable refresh, `{ database: "b", table }`), `:36` (no `updateTableColumns`), `:49` (TabTableProperties refresh). Both fail when their site is reverted (F1, F2). | PASS |
| C29 | `connectionForTab` with `b` sends `database:"b"`; `null` -> default | batched VU, passed at b5388112c | carried from e122bdff5: `tabDatabase.spec.ts:76` - `toMatchObject({ database: "b" })`; `:78` - `toBe(connection)`. Round 3 gap 2 re-judged: the helper-only level is now backed by the component tests in `tabDatabaseColumns.spec.ts:35,49,71-72`, which call the real `refreshTable`, `refresh` and `fkClick` methods with a tab bound to `b`. Partly closed: `initialize` (`TableTable.vue:1166`, the open path), `:2052`, `TableSchema.vue:410` and `TableRelations.vue:323` still survive a revert (gap 1). | PASS |
| C30 | new query tab persists `databaseName:"a"` | batched VU, passed at b5388112c | carried from e122bdff5: `tabDatabase.spec.ts:88` | PASS |
| C31 | after `changeDatabase("c")`, `b` tab still resolves and sends `b` | batched VU, passed at b5388112c | carried from e122bdff5: `tabDatabase.spec.ts:102`, `:104`, `:107`. Re-judged at b5388112c (AC 14): resolution in a component is now shown for FK navigation - `tabDatabaseColumns.spec.ts:71` - `tablesFor` called with `"b"`; `:72` - `loadTable` emitted with `database: "b"`. Killed by F3a and F3b. Table resolution on open is still store-level only (gap 1). | PASS |
| C32 | `matches` false for `a` vs `b`; true for `null` vs default `a` | batched VU, passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/transport/TransportOpenTab.spec.ts:10`, `:13` | PASS |
| C33 | selector writes tab `databaseName`, next run sends it; selector `disabled` while transaction / reserved | batched VU, both passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/QueryDatabaseSelector.spec.ts:48`, `:54`, `:64`, `:75`, `:79-80`, `:84` | PASS |
| C34 | transaction timeout rolls back on client `b`, not active | batched VU, passed at b5388112c | carried from e122bdff5: `connectionFor.spec.ts:133-134` | PASS |
| C35 | tab bound to `b`, table missing in `b` -> not-found text | batched VU, passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:33-34` | PASS |
| C36 | 1 table item whose title includes the database name and `orders`, plus 2 database items | batched VU, passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:24-31` | PASS |
| C37 | table result emits `loadTable` with `database:"b"`; database result expands, 0 `changeDatabase` | batched VU, both passed at b5388112c | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/QuickSearch.spec.ts:21`, `:28`, `:30` | PASS |
| C38 | query tab `databaseName "b"` shows `b` in header and selector; default `a` shows `a` | batched VU, both passed at b5388112c | carried from e122bdff5: `QueryDatabaseSelector.spec.ts:35-38`; `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:28`, `:31` | PASS |

## Round 3 gap 1 - the Jest assertion change

`apps/studio/tests/unit/components/tableview/TableTable.spec.ts:184` now asserts
`dispatch("updateDatabaseTableColumns", { database: undefined, table })` (was `"updateTableColumns", table`).

Judgement: **intent preserved at the component level, weakened end to end.** The test's purpose (#4567) is
"explicit refresh re-fetches column metadata". It still proves that `refreshTable` dispatches a column re-fetch
for the tab's (default) database, and it is killed when `TableTable.vue:2164` is reverted (F1: Jest 1 failed).
But the re-fetch for the default database now depends on the delegation in `apps/studio/src/store/index.ts:754-755`
(`database == null` -> `dispatch('updateTableColumns', table)`), and **no test covers that delegation**: replacing
it with a bare `return` (F9) leaves Jest (32/32 in `tests/unit/components/tableview` + `tests/unit/lib/tableinfo`)
and the full Vitest suite (2689) green. A regression that silently disables #4567 for every default-database
tab would pass. Surviving mutant; ranked gap 2.

## Fault injection (second scratch worktree)

Run in a separate `git worktree add --detach .../verify-r4-faults b5388112c` with the same node_modules
symlinks. Each fault restored with `git checkout -- apps/studio/src` before the next; suites per fault: full
`yarn vitest:unit` + `yarn test:unit tests/unit/components/tableview tests/unit/lib/tableinfo`. The worktree was
removed afterwards and the main tree's `git status --porcelain` was byte-identical before and after.

| Fault | Site | Vitest | Jest | Killed by |
| --- | --- | --- | --- | --- |
| F1 refresh -> `updateTableColumns` | `TableTable.vue:2164` | 1 failed | 1 failed | `tabDatabaseColumns.spec.ts:35`; `TableTable.spec.ts:184` |
| F2 structure refresh -> `updateTableColumns` | `TabTableProperties.vue:376` | 1 failed | green | `tabDatabaseColumns.spec.ts:49` |
| F3a FK lookup `tablesFor(null)` | `fk_click.ts:81` | 1 failed | green | `tabDatabaseColumns.spec.ts:71` |
| F3b FK payload without `database` | `fk_click.ts:149` | 1 failed | green | `tabDatabaseColumns.spec.ts:72` |
| F4 open (`initialize`) -> `updateTableColumns` | `TableTable.vue:1166` | green | green | survived |
| F5 fields-changed reload -> `updateTableColumns` | `TableTable.vue:2052` | green | green | survived |
| F6 schema tab -> `database: null` | `TableSchema.vue:410` | green | green | survived |
| F7 relations column load -> `database: null` | `TableRelations.vue:323` | green | green | survived |
| F8 relations `schemas` -> default getter | `TableRelations.vue:143-145` | green | green | survived |
| F9 store null-db delegation removed | `store/index.ts:754-755` | green | green | survived |

Round 3's "no test fails when the fix is reverted" is closed only partly: reverting commit 7173ae90b's
component changes as a whole turns `tabDatabaseColumns.spec.ts` red, but 4 of its 7 sites can be reverted
individually with everything green. But F4 is the exact path the manual test hit (a
table tab from `b` failed to **open**), and the Round 3 report suggested `initialize` specifically; the new test
covers `refreshTable` instead.

## TableRelations change

`TableRelations.vue:138-148` now derives `schemas` / `schemaTables` from `tablesFor(this.tabDatabase())`
instead of the default-database store getters, closing the Round 3 observation. It is **not covered** (F8
survives). Reviewed by reading: `schemas` matches the old getter's logic for the default database;
`schemaTables` now groups all tables rather than the sidebar-filtered `filteredTables` and drops `routines` and
the single-schema collapse. Its only use (`TableRelations.vue:304`, FK target table picker when a `toSchema` is
set) needs only `schema` + `tables`, so that is benign and arguably better for a picker. For schemaless
dialects `_.groupBy` yields a `"undefined"` key, but that branch is only reached when `toSchema` is set.

## Ranked gaps

1. **Open path not proven at component level (blocking, surviving mutant F4; also F5-F7).** Reverting `TableTable.vue:1166` (`initialize`,
   the path a newly opened table tab runs, i.e. the manual-test bug), `:2052`, `TableSchema.vue:410` or
   `TableRelations.vue:323` keeps every Vitest and Jest test green (F4-F7). AC 12/14 are now proven for refresh,
   structure refresh and FK navigation, not for opening. A one-line test calling `initialize` with
   `tab.databaseName: "b"` (same pattern as `tabDatabaseColumns.spec.ts:14-37`) would close it.
2. **#4567 re-fetch for the default database depends on an untested delegation (blocking, surviving mutant F9).**
   `store/index.ts:754-755` can be removed with every test green (F9). A Vitest store test dispatching
   `updateDatabaseTableColumns` with `database: null` and asserting `conn/listTableColumns` (or the
   `updateTableColumns` path) would restore the end-to-end intent of the old Jest assertion.
3. **`TableRelations` schema derivation untested (surviving mutant F8; lowest impact).** A component test of `schemaTables` / `schemas` with `tablesFor("b")` returning a `reporting` schema would kill it.

## Gate

- `yarn vitest:unit <14 proof files> -t "<all proof names + 7 regression tests>" --reporter=verbose`: 46 passed, 0 failed, 1 skipped (not a proof). Exit 0, at b5388112c.
- C26 and C27 grep proofs: exit 0, at b5388112c.
- `yarn vitest:unit` (full): 52 files, 2689 passed, 0 failed, 1 todo. Exit 0, at b5388112c.
- `yarn test:unit` (full legacy Jest): 80 suites, 799 passed, 0 failed. Exit 0, at b5388112c.
- `yarn vitest:integration ... -t "lists tables of a non-active database"`: carried from e122bdff5 (1 passed); not re-run, no integration-relevant file changed since.

Gate outcome: every proof, both full suites and both greps are green at b5388112c; the feature is not done
because of surviving mutants F4-F9 (gaps 1-3). Round 4 is past the three-round bound, so this goes to the user.

Non-blocking observations (carried from Round 3, not re-judged): routines failures only logged; a `force`
reload can receive older in-flight routines; `updateDatabaseTableColumns` drops columns when the table is not in
`databaseEntities[database]` (`store/index.ts:761-763`); `queryClients` leak on never-executed query ids;
C33/C38 prop forwarding shown by citation only.
