# Multi-database navigation verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 78f8c858d^..7173ae90b
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 3 is scoped to the fix diff `828ccf539..7173ae90b` (manual test: tables of a non-default
database did not open). Round 2 had no non-PASS verdicts, so the fix diff is the whole scope.
Every unit proof was re-run in full at `7173ae90b`. Citations were refreshed for the files the fix
touched: `store/index.ts`, `databaseEntities.spec.ts`, `TableTable.vue`, `TabTableProperties.vue`,
`TableSchema.vue`, `TableRelations.vue`, `mixins/fk_click.ts`. Rows whose evidence sits in files the
fix did not touch say `carried from e122bdff5`.

**All 38 checks are proven at `7173ae90b`. The verdict is FAIL because the fix turned an existing
test red**: `tests/unit/components/tableview/TableTable.spec.ts:182` (legacy Jest, run by
`yarn test:unit` in CI) asserts `dispatch("updateTableColumns", table)` on refresh, and
`TableTable.vue:2164` now dispatches `updateDatabaseTableColumns`. No numbered check covers it, so
no row below is non-PASS; the regression is gap 1.

Profile `light`: no binding-source step, no Coverage recompute, no fault injection.

## Proof run (verified at 7173ae90b)

- One batched VU invocation from `apps/studio/`: `yarn vitest:unit <13 proof spec files> -t "<alternation of all 39 proof names>|parallel opens of different databases respect the limit|a client running a query is not evicted|loads columns of another database|lists tables, views and materialized views at once" --reporter=verbose`.
  Exit 0: 13 files, 43 passed, 1 skipped. Each of the 39 named proofs shows `✓` on its own line, as do the 2 Round 2 risk tests and the fix's 2 new tests. The skip is `connectionFor > creates a non-active client once when two calls race` (not a proof).
  Note: a first attempt with the full name `loads columns of another database's table from that database, in place` in the alternation left that test `↓` skipped (the apostrophe does not survive the `yarn` script pass-through); it was re-run with a substring and passed, and also passed in a file-only run (`databaseEntities.spec.ts`, 5/5).
- C26 and C27 grep proofs run verbatim from `apps/studio/`: both exit 0, same output as Round 2.
- C18 (VI, docker postgres) **not re-run**: the fix touches no file under `src/handlers`, `src/lib`, `src-commercial` or the integration spec. Carried from e122bdff5.
- Full `yarn vitest:unit`: exit 0, 51 files, 2686 passed, 0 failed, 1 todo.
- Legacy Jest on the specs that reference touched components: `yarn test:unit tests/unit/components/tableview/ tests/unit/lib/tableinfo/structure.spec.ts` - **exit 1**, 31 passed, 1 failed: `TableTable.vue — refresh > dispatches updateTableColumns on explicit refresh (issue-4567)` at `TableTable.spec.ts:182`.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | null / active db -> `state.connection`, 0 creates | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/handlers/connectionFor.spec.ts:69` - `expect(await connectionFor(SID, null)).toBe(active)`; `:72` - `createConnection).toHaveBeenCalledTimes(0)`. Re-read at e122bdff5: early return is still `apps/studio/src/handlers/handlerState.ts:124`. | PASS |
| C2 | 2 calls for `b` -> 1 create, 1 connect, same client | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `connectionFor.spec.ts:78` - `expect(first).toBe(second)`; `:80` - `toHaveBeenCalledTimes(1)`; `:82` - `connect).toHaveBeenCalledTimes(1)`. Re-read at e122bdff5: cache/pending paths `handlerState.ts:129-136` are unchanged by the fix. | PASS |
| C3 | connect rejects -> same error, `server.db["b"]` undefined | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `connectionFor.spec.ts:99` - `rejects.toBe(error)`; `:100` - `server.cache["b"]).toBeUndefined()`. verified at e122bdff5: destroy+rethrow moved to `handlerState.ts:143-145`. | PASS |
| C4 | one client disconnect keeps tunnel, no shutdown | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/lib/db/serverClientCache.spec.ts:34` - `sshTunnel).not.toBeNull()`; `:35` - `shutdown).not.toHaveBeenCalled()` | PASS |
| C5 | `conn/disconnect` disconnects 2/2 clients, tunnel null | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `connectionFor.spec.ts:118-120` - both `disconnect` x1, `sshTunnel).toBeNull()`. verified at e122bdff5: the handler still calls `s.server.end()` at `apps/studio/src-commercial/backend/handlers/connHandlers.ts:308` (the fix's one-line change is at `:389`, in `conn/query`). | PASS |
| C6 | SurrealDB cached under `ns::db` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `serverClientCache.spec.ts:43` - `expect(second).toBe(first)`; `:44` - `server.db("ns::db")).toBe(first)` | PASS |
| C7 | `forDatabase("b")` sends `database:"b"` on 4 calls; default sends none | batched VU, both passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/lib/utility/ElectronUtilityConnectionClient.spec.ts:27` - `toMatchObject({ database: "b" })` over 4 handlers; `:37` - `not.toHaveProperty("database")` | PASS |
| C8 | `conn/listTables {database:"b"}` hits `server.db["b"]` only | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `connectionFor.spec.ts:107` - `cache["b"].listTables).toHaveBeenCalledTimes(1)`; `:108` - `active.listTables).toHaveBeenCalledTimes(0)` | PASS |
| C9 | 2 dispatches -> 1 `conn/listTables` with `b`, loaded, `tablesFor("b")` | batched VU, passed at 7173ae90b | verified at 7173ae90b (spec touched, lines unchanged; action now `Promise.all`s tables/views/materialized views at `apps/studio/src/store/index.ts:840-863` and loads routines after): `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:44` - `expect(listTables).toHaveLength(1)`; `:45` - `toMatchObject({ database: "b" })`; `:46` - `status).toBe("loaded")`; `:47` - `tablesFor("b")` names `["orders", "orders_view"]`. The parallel load still dedupes: the `loading`/`loaded` guard precedes the first `await`. | PASS |
| C10 | loading while pending, then error + driver message | batched VU, passed at 7173ae90b | verified at 7173ae90b: `databaseEntities.spec.ts:58` - `status).toBe("loading")`; `:63` - `status).toBe("error")`; `:64` - `.error).toBe("permission denied for database b")`. The error branch now `return`s before the routines step (`store/index.ts`, catch after the `Promise.all`), so a tables failure cannot be overwritten by a later routines commit. A routines-only failure is logged and leaves status `loaded` (not a check; see observations). | PASS |
| C11 | store `disconnect` -> `databaseEntities` `{}` | batched VU, passed at 7173ae90b | verified at 7173ae90b: `databaseEntities.spec.ts:75` - `expect(store.state.databaseEntities).toEqual({})`; reset at `store/index.ts:413`. A routines call still in flight at disconnect is dropped by the `loaded?.status === 'loaded'` guard, so it cannot resurrect an entry. | PASS |
| C12 | 3 db rows, `a` expanded with tables, `b`/`c` collapsed | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:92` - `rows).toHaveLength(3)`; `:95` - `[["a", true], ["b", false], ["c", false]]` | PASS |
| C13 | expanding `b` dispatches load once; its schema and table rows render under `b` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `VirtualTableList.spec.ts:105` - `loadDatabaseEntities).toHaveBeenCalledTimes(1)`; `:106` - `{ database: "b", force: false }`. The fixture now gives `b` 2 schemas (`salesB` in `reporting`, `:18`), so schema folders render. `:118` - `expect(shownSchemas).toEqual(["public", "reporting"])` over `displayItems` whose parent is `b`. `:120` - `bChildren).toEqual(["users", "events"])`. An implementation that renders no schema rows under a non-default database now fails `:118`. | PASS |
| C14 | loading indicator; error + retry re-dispatches `b` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `VirtualTableList.spec.ts:131` - `"Loading..."`; `:139` - `toContain("permission denied for database b")`; `:143` - `toHaveBeenCalledTimes(1)`; `:144` - `{ database: "b", force: true }` | PASS |
| C15 | collapse `a` -> 0 descendants | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `VirtualTableList.spec.ts:151` - `publicSchema.expanded).toBe(true)`; `:158` - `underA).toHaveLength(0)` | PASS |
| C16 | `multipleDatabases` disabled -> 0 db rows, schemas top-level | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `VirtualTableList.spec.ts:165` - `databaseRows()).toHaveLength(0)`; `:167` - `[["public", 0], ["audit", 0]]` | PASS |
| C17 | pin and hidden entity with `databaseName "b"` apply only under `b`, where `a` has the same `public.users` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): the hidden record is now `b.public.users` (`VirtualTableList.spec.ts:173`), and `a` also has `public.users`. `:183` - `item("b", "users").pinned).toBe(true)`; `:184` - `item(null, "users").pinned).toBe(false)`; `:185` - `item("b", "users").hidden).toBe(true)`; `:186` - `item(null, "users").hidden).toBe(false)`. If `isHiddenEntity` ignored `databaseName` (`apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue:255`), `:186` would fail. | PASS |
| C18 | real Postgres: `connectionFor(sId,"b").listTables()` has `tb` not `ta`, active stays `a` | not re-run: the fix (`828ccf539..7173ae90b`) touches no file under `src/handlers`, `src/lib`, `src-commercial` or the integration spec (`git diff --stat` shows only the store, 5 components/mixin and one unit spec) | carried from e122bdff5 (VI passed there against a real postgres container): `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:65` - `toContain("tb")`; `:66` - `not.toContain("ta")`; `:67` - `state(SID).database).toBe("a")` | PASS |
| C19 | limit 2, `b` LRU -> disconnect `b`, remove, then create `d` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/handlers/clientLifecycle.spec.ts:78` - `b.disconnect).toHaveBeenCalledTimes(1)`; `:79` - `cache["b"]).toBeUndefined()`; `:80` - `cache["c"]).toBeDefined()`; `:82-83` - destroy before create `d`. The new pending count (`handlerState.ts:214`) does not change this sequential path. | PASS |
| C20 | none idle -> rejects with message containing `"2"`, no create for `d` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `clientLifecycle.spec.ts:92` - `rejects.toThrow(/2/)`; `:93` - `createConnection).not.toHaveBeenCalledWith("d")`. The message is now at `handlerState.ts:219`, and its only digit is the limit. | PASS |
| C21 | idle 5001 ms evicted, 4000 ms kept | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `clientLifecycle.spec.ts:103-104` set the last-use times; `:108` - `b.disconnect).toHaveBeenCalledTimes(1)`; `:109` - `cache["b"]).toBeUndefined()`; `:110` - `c.disconnect).not.toHaveBeenCalled()`; `:111` - `cache["c"]).toBe(c)` | PASS |
| C22 | sweep and limit never evict active / reserved / in-transaction | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `clientLifecycle.spec.ts:126-128` - `active`, `b` (reserved) and `c` (real `conn/startTransaction`) `.disconnect).not.toHaveBeenCalled()`; `:131` - limit `rejects.toThrow(/2/)`; `:132` - `active.disconnect).not.toHaveBeenCalled()`. `clientBusy` (`handlerState.ts:174-178`) now also counts running queries. That makes it stricter and does not weaken the claim. | PASS |
| C23 | evicted `b` recreated and `listTables` resolves | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `clientLifecycle.spec.ts:139` - `cache["b"]).toBeUndefined()`; `:143` - `createConnection).toHaveBeenCalledTimes(2)`; `:144` - `tables).toEqual([{ name: "b_table" }])` | PASS |
| C24 | after `conn/disconnect`, 10x sweep interval -> no disconnect | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `clientLifecycle.spec.ts:156` - `destroyConnection).not.toHaveBeenCalled()`; `:157` - `disconnects()).toBe(before)`; `:158` - `clientSweep).toBeNull()`. `connHandlers.ts:305` `stopClientSweep(sId)` is unchanged. | PASS |
| C25 | limit and sweep eviction keep the tunnel | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `clientLifecycle.spec.ts:169-170` - `destroyConnection` called with `"b"` and `"c"`; `:171` - `sshTunnel).toBe(tunnel)`; `:172` - `shutdown).not.toHaveBeenCalled()` | PASS |
| C26 | `[db.default] maxOpenDatabases = 5`, `idleDatabaseTimeout = 600000`, both typed | grep verbatim at 7173ae90b, exit 0 | carried from e122bdff5, re-grepped at 7173ae90b with the same output: `apps/studio/default.config.ini:113` - `maxOpenDatabases = 5`; `:117` - `idleDatabaseTimeout = 600000 ; 10 Minutes`; `apps/studio/src/typings/bksConfig.d.ts` - 27 occurrences each | PASS |
| C27 | migration registered, `ALTER TABLE ... "databaseName" varchar NULL`, in both `pickable` | grep verbatim at 7173ae90b, exit 0 | carried from e122bdff5, re-grepped at 7173ae90b with the same output: `apps/studio/src/migration/20261015_add_tab_database_name.js:5`; `src/migration/index.js:100`; `src/common/appdb/models/OpenTab.ts:11` and `src/common/transport/TransportOpenTab.ts:12` - `pickable` includes `'databaseName'` | PASS |
| C28 | table + table-properties from `b` -> `databaseName:"b"`, saved | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/store/tabDatabase.spec.ts:61` - `[["table", "b"], ["table-properties", "b"]]`; `:66` - `saved.args.obj.databaseName).toBe("b")` | PASS |
| C29 | `connectionForTab` with `b` sends `database:"b"`; `null` -> default | batched VU, passed at 7173ae90b | carried from e122bdff5 (spec untouched): `apps/studio/tests/vitest/unit/store/tabDatabase.spec.ts:76` - `toMatchObject({ database: "b" })`; `:78` - `toBe(connection)`. Re-judged at 7173ae90b: the check as worded is proven, but it is helper-level only. AC 12 says the tab's *queries* are sent with `b`; the bug this fix repaired was a tab path (column load via `updateTableColumns`) that bypassed this helper while C29 stayed green. The fix's new test proves the store action `updateDatabaseTableColumns` routes by database, not that `TableTable.vue:1166/2052/2164`, `TabTableProperties.vue:376`, `TableSchema.vue:410` or `TableRelations.vue:316` dispatch it with the tab's database. Precision/level gap recorded (gap 2). | PASS |
| C30 | new query tab persists `databaseName:"a"` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `tabDatabase.spec.ts:88` - `databaseName).toBe("a")` | PASS |
| C31 | after `changeDatabase("c")`, `b` tab still resolves and sends `b` | batched VU, passed at 7173ae90b | carried from e122bdff5 (spec untouched): `tabDatabase.spec.ts:102` - `database).toBe("c")`; `:104` - `tablesFor("b")` resolves the table; `:107` - `{ database: "b" }`. Re-judged at 7173ae90b: "table still resolves" is proven as a store lookup, not as the table opening (columns loading) in a component; the same gap as C29 applies (gap 2). | PASS |
| C32 | `matches` false for `a` vs `b`; true for `null` vs default `a` | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/transport/TransportOpenTab.spec.ts:10` - `toBe(false)`; `:13` - `toBe(true)` | PASS |
| C33 | selector writes tab `databaseName`, next run sends it; selector `disabled` while transaction / reserved | batched VU, both passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): 39-41` `locked`, `:50` guard). The editor only forwards raw state (`apps/studio/src/components/TabQueryEditor.vue:103-106`). Change: `apps/studio/tests/vitest/unit/components/QueryDatabaseSelector.spec.ts:48` - `tab.databaseName).toBe("b")` through a real DOM `change`; `:54` - `dispatch).toHaveBeenCalledWith("tabs/save", tab)`; `:64` - `toMatchObject({ database: "b" })` through the editor's real `connection` computed. Disabled: `:75` - `attributes("disabled")).toBe("disabled")` for `hasActiveTransaction` and then for `isManualCommit`; `:79-80` - a forced change leaves `"a"` and emits nothing; `:84` - not disabled when idle. A lock on only one of the two flags fails the loop, and so does a lock with no write guard. | PASS |
| C34 | transaction timeout rolls back on client `b`, not active | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `connectionFor.spec.ts:133` - `b.rollbackTransaction).toHaveBeenCalledWith(7)`; `:134` - `active.rollbackTransaction).toHaveBeenCalledTimes(0)`. verified at e122bdff5: `connHandlers.ts:390` still passes the resolved `connection` to `createOrResetTransactionTimeout`. | PASS |
| C35 | tab bound to `b`, table missing in `b` -> not-found text | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:33` - `toContain("This table does not exist in the selected database")`; `:34` - `.table-slot").exists()).toBe(false)` | PASS |
| C36 | 1 table item whose title includes the database name and `orders`, plus 2 database items | batched VU, passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): the other database is now named `warehouse` (`apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:7,10`). `:24` - `otherTables).toHaveLength(1)`; `:25` - `title).toContain("warehouse")`, which `"public.orders"` cannot satisfy; `:26` - `toContain("orders")`; `:28` - the default database's title is exactly `"public.users"`; `:31` - `databases).toEqual(["a", "warehouse"])`. Source: `apps/studio/src/store/modules/SearchModule.ts:103` `${database} · ${name}`. | PASS |
| C37 | table result emits `loadTable` with `database:"b"`; database result expands, 0 `changeDatabase` | batched VU, both passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `apps/studio/tests/vitest/unit/components/QuickSearch.spec.ts:21` - `{ table, database: "b" }`; `:28` - `expandDatabase, "b"`; `:30` - `changeDatabase` count 0 | PASS |
| C38 | query tab `databaseName "b"` shows `b` in header and selector; default `a` shows `a` in both | batched VU, both passed at 7173ae90b | carried from e122bdff5 (evidence files untouched by the fix): `QueryDatabaseSelector.spec.ts:35` - a tab with `databaseName: "b"` selects `"b"`; `:36` - `"a"` selects `"a"`; `:38` - `databaseName: null` falls back to store default `"a"`. The selector computes this itself (`QueryDatabaseSelector.vue:35-37`), and the editor passes `:tab="tab"` (`TabQueryEditor.vue:103`). Header half, carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:28` - `.tab-database").text()).toBe("b")`; `:31` - `.toBe("a")` | PASS |

Brief mapping note: the dispatch brief referred to "C12 queries sent with database b" and "C14
table still resolves". In `checks.md` those claims are AC 12 / AC 14, proven by C28/C29 and C31
(C12/C14 are tree-rendering checks, unaffected by the fix). They are judged in the C29 and C31 rows.

### The fix's new tests (verified at 7173ae90b)

- `databaseEntities.spec.ts:78` `loads columns of another database's table from that database, in place`:
  `:90` - `call[1]).toMatchObject({ table: "orders", database: "b" })`; `:92` - `tablesFor("b").find(...)).toBe(orders)`;
  `:93` - `orders.columns).toEqual([{ columnName: "id", dataType: "int" }])`; `:94` - default `tables` length unchanged.
  Under the old action (`{ ...t, columns }` replacement + `databaseEntities` re-commit) `:92` fails (new object) and
  `:93` fails (`orders` keeps `[]`). It discriminates the **in-place** change. It does **not** discriminate the bug
  the manual test found: `:90` already passed before the fix, because the old store action already sent `database: "b"`;
  the bug was in the components dispatching `updateTableColumns`. Reverting `TableTable.vue:1166` to
  `updateTableColumns` leaves every Vitest spec green.
- `databaseEntities.spec.ts:97` `lists tables, views and materialized views at once, before routines`:
  `:106` - exactly the 3 list channels pending together; `:114-115` - `loaded` with tables while routines are pending;
  `:118` - routines arrive after. The old sequential code would have only `conn/listTables` pending at `:106`. Discriminates.

### Swept `existing` re-read (carried from e122bdff5)

- authorization: `existing - the database's own permissions`. `connectionFor` still destroys the
  client and rethrows the driver error unchanged (`apps/studio/src/handlers/handlerState.ts:143-145`,
  untouched by the fix). C3 and C14 surface that error.

### Ranked gaps

1. **Regression in the existing suite (blocking).** `apps/studio/tests/unit/components/tableview/TableTable.spec.ts:182` -
   `expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateTableColumns", table)` fails at 7173ae90b because
   `apps/studio/src/components/tableview/TableTable.vue:2164` dispatches
   `updateDatabaseTableColumns, { database: this.tab?.databaseName, table }`. Behaviour for the issue #4567 case is
   preserved (for a null/default database `updateDatabaseTableColumns` delegates to `updateTableColumns`,
   `store/index.ts:754-755`), so the test is coupled to the old action name. CI's `yarn test:unit` is red until the
   assertion is updated (or the test moved to Vitest, per CLAUDE.md "migrate, don't add").
2. **Precision/level gap: AC 12 / AC 14 proven below the component boundary (C29, C31).** The checks prove the
   helper (`connectionForTab`) and the store lookup (`tablesFor`), which were green while a tab's column load went to
   the default database. The fix's routing in `TableTable.vue:1166,2052,2164`, `TabTableProperties.vue:376`,
   `TableSchema.vue:410`, `TableRelations.vue:316` and `fk_click.ts:79-81,149` is shown by citation only; no test
   mounts or calls these with a non-default `databaseName`. A future regression of the same kind would again pass
   every check. A check such as "TableTable `initialize` with tab `databaseName "b"` dispatches
   `updateDatabaseTableColumns` with `database: "b"`" (and the FK-click lookup via `tablesFor("b")`) would close it.

## Gate

- `yarn vitest:unit <13 proof files> -t "<39 proof names + 2 risk tests + 2 fix tests>" --reporter=verbose`: 43 passed, 0 failed, 1 skipped (not a proof). Exit 0, at 7173ae90b.
- C26 and C27 grep proofs: exit 0, at 7173ae90b.
- `yarn vitest:unit` (full): 51 files, 2686 passed, 0 failed, 1 todo. Exit 0, at 7173ae90b.
- `yarn vitest:integration ... -t "lists tables of a non-active database"`: carried from e122bdff5 (1 passed); not re-run, fix does not touch its code.
- `yarn test:unit tests/unit/components/tableview/ tests/unit/lib/tableinfo/structure.spec.ts`: 31 passed, **1 failed**. Exit 1, at 7173ae90b (gap 1).

Non-blocking observations:
- Routines now load after tables. A routines failure is only logged (`store/index.ts`, second `try` in
  `loadDatabaseEntities`); the node shows `loaded` with no routines and no error or retry.
- A `force` reload that finishes its tables before an older in-flight `listRoutines` resolves could receive the
  older routines (the guard checks only `status === 'loaded'`). Low impact.
- `updateDatabaseTableColumns` discards fetched columns when the table is not in `databaseEntities[database]`
  (`store/index.ts:761-763`), e.g. for a tab restored before its database's entities were loaded; the tab then renders
  with whatever columns its own table object carries.
- `TableRelations.vue` still maps `schemas`/`schemaTables` from the default database (`mapGetters` at `:141`), so FK
  target pickers in a non-default tab may list the default database's schemas. Outside the checks.
- Carried from Round 2: `queryClients` leak on a query id never executed or cancelled (fails safe); C33/C38 prop
  forwarding shown by citation only.
