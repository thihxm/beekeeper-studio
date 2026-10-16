# Multi-database navigation verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 78f8c858d^..e122bdff5
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 is scoped to the fix diff `3e5c0d68c..e122bdff5` and the five Round 1 FAILs (C13, C17, C33,
C36, C38). Every proof was re-run in full at `e122bdff5`. The five FAILs were re-judged
adversarially. Citations were refreshed for every file the fix touched: `handlerState.ts`,
`connHandlers.ts`, `queryHandlers.ts`, `TabQueryEditor.vue`, `QueryDatabaseSelector.vue`, and the
specs `QueryDatabaseSelector`, `VirtualTableList`, `clientLifecycle` and `SearchModule`. Rows whose
evidence sits in files the fix did not touch say `carried from 3e5c0d68c`, and their proofs are
still re-run green at `e122bdff5`.

Profile `light`: no binding-source step (the only binding source is the user request, with no
design), no Coverage recompute and no fault injection.

## Proof run (verified at e122bdff5)

- One batched VU invocation from `apps/studio/`: `yarn vitest:unit <13 proof spec files> -t "<alternation of all 39 proof names>|parallel opens of different databases respect the limit|a client running a query is not evicted" --reporter=verbose`.
  It exited 0 with 13 files, 41 passed and 1 skipped. Each of the 39 named proofs shows `✓` on its own line, and so do the 2 new risk tests. The skipped test is `connectionFor > creates a non-active client once when two calls race`, which is not a proof.
- VI: `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists tables of a non-active database" --reporter=verbose` ran against a real postgres container and exited 0, with 1 passed. It was re-run because the fix touched `handlerState.ts`, which `connectionFor` lives in.
- The C26 and C27 grep proofs were run verbatim from `apps/studio/`. Both exited 0.
- The full `yarn vitest:unit` run exited 0: 51 files, 2684 passed, 0 failed, 1 todo.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | null / active db -> `state.connection`, 0 creates | batched VU, passed at e122bdff5 | carried from 3e5c0d68c (spec untouched): `apps/studio/tests/vitest/unit/handlers/connectionFor.spec.ts:69` - `expect(await connectionFor(SID, null)).toBe(active)`; `:72` - `createConnection).toHaveBeenCalledTimes(0)`. Re-read at e122bdff5: early return is still `apps/studio/src/handlers/handlerState.ts:124`. | PASS |
| C2 | 2 calls for `b` -> 1 create, 1 connect, same client | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `connectionFor.spec.ts:78` - `expect(first).toBe(second)`; `:80` - `toHaveBeenCalledTimes(1)`; `:82` - `connect).toHaveBeenCalledTimes(1)`. Re-read at e122bdff5: cache/pending paths `handlerState.ts:129-136` are unchanged by the fix. | PASS |
| C3 | connect rejects -> same error, `server.db["b"]` undefined | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `connectionFor.spec.ts:99` - `rejects.toBe(error)`; `:100` - `server.cache["b"]).toBeUndefined()`. verified at e122bdff5: destroy+rethrow moved to `handlerState.ts:143-145`. | PASS |
| C4 | one client disconnect keeps tunnel, no shutdown | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/lib/db/serverClientCache.spec.ts:34` - `sshTunnel).not.toBeNull()`; `:35` - `shutdown).not.toHaveBeenCalled()` | PASS |
| C5 | `conn/disconnect` disconnects 2/2 clients, tunnel null | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `connectionFor.spec.ts:118-120` - both `disconnect` x1, `sshTunnel).toBeNull()`. verified at e122bdff5: the handler still calls `s.server.end()` at `apps/studio/src-commercial/backend/handlers/connHandlers.ts:308` (the fix's one-line change is at `:389`, in `conn/query`). | PASS |
| C6 | SurrealDB cached under `ns::db` | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `serverClientCache.spec.ts:43` - `expect(second).toBe(first)`; `:44` - `server.db("ns::db")).toBe(first)` | PASS |
| C7 | `forDatabase("b")` sends `database:"b"` on 4 calls; default sends none | batched VU, both passed at e122bdff5 | carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/lib/utility/ElectronUtilityConnectionClient.spec.ts:27` - `toMatchObject({ database: "b" })` over 4 handlers; `:37` - `not.toHaveProperty("database")` | PASS |
| C8 | `conn/listTables {database:"b"}` hits `server.db["b"]` only | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `connectionFor.spec.ts:107` - `cache["b"].listTables).toHaveBeenCalledTimes(1)`; `:108` - `active.listTables).toHaveBeenCalledTimes(0)` | PASS |
| C9 | 2 dispatches -> 1 `conn/listTables` with `b`, loaded, `tablesFor("b")` | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:44` - `toHaveLength(1)`; `:45` - `{ database: "b" }`; `:46` - `"loaded"`; `:47` - `tablesFor("b")` names | PASS |
| C10 | loading while pending, then error + driver message | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `databaseEntities.spec.ts:58` - `"loading"`; `:63` - `"error"`; `:64` - `.error).toBe("permission denied for database b")` | PASS |
| C11 | store `disconnect` -> `databaseEntities` `{}` | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `databaseEntities.spec.ts:75` - `databaseEntities).toEqual({})` | PASS |
| C12 | 3 db rows, `a` expanded with tables, `b`/`c` collapsed | batched VU, passed at e122bdff5 | carried from 3e5c0d68c (the spec's lines before 100 are unchanged): `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:92` - `rows).toHaveLength(3)`; `:95` - `[["a", true], ["b", false], ["c", false]]` | PASS |
| C13 | expanding `b` dispatches load once; its schema and table rows render under `b` | batched VU, passed at e122bdff5 | verified at e122bdff5 (re-judged): `VirtualTableList.spec.ts:105` - `loadDatabaseEntities).toHaveBeenCalledTimes(1)`; `:106` - `{ database: "b", force: false }`. The fixture now gives `b` 2 schemas (`salesB` in `reporting`, `:18`), so schema folders render. `:118` - `expect(shownSchemas).toEqual(["public", "reporting"])` over `displayItems` whose parent is `b`. `:120` - `bChildren).toEqual(["users", "events"])`. An implementation that renders no schema rows under a non-default database now fails `:118`. | PASS |
| C14 | loading indicator; error + retry re-dispatches `b` | batched VU, passed at e122bdff5 | verified at e122bdff5 (lines moved): `VirtualTableList.spec.ts:131` - `"Loading..."`; `:139` - `toContain("permission denied for database b")`; `:143` - `toHaveBeenCalledTimes(1)`; `:144` - `{ database: "b", force: true }` | PASS |
| C15 | collapse `a` -> 0 descendants | batched VU, passed at e122bdff5 | verified at e122bdff5 (lines moved): `VirtualTableList.spec.ts:151` - `publicSchema.expanded).toBe(true)`; `:158` - `underA).toHaveLength(0)` | PASS |
| C16 | `multipleDatabases` disabled -> 0 db rows, schemas top-level | batched VU, passed at e122bdff5 | verified at e122bdff5 (lines moved): `VirtualTableList.spec.ts:165` - `databaseRows()).toHaveLength(0)`; `:167` - `[["public", 0], ["audit", 0]]` | PASS |
| C17 | pin and hidden entity with `databaseName "b"` apply only under `b`, where `a` has the same `public.users` | batched VU, passed at e122bdff5 | verified at e122bdff5 (re-judged): the hidden record is now `b.public.users` (`VirtualTableList.spec.ts:173`), and `a` also has `public.users`. `:183` - `item("b", "users").pinned).toBe(true)`; `:184` - `item(null, "users").pinned).toBe(false)`; `:185` - `item("b", "users").hidden).toBe(true)`; `:186` - `item(null, "users").hidden).toBe(false)`. If `isHiddenEntity` ignored `databaseName` (`apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue:255`), `:186` would fail. | PASS |
| C18 | real Postgres: `connectionFor(sId,"b").listTables()` has `tb` not `ta`, active stays `a` | VI re-run at e122bdff5 (`handlerState.ts` touched), passed | carried from 3e5c0d68c (spec untouched): `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:65` - `toContain("tb")`; `:66` - `not.toContain("ta")`; `:67` - `state(SID).database).toBe("a")` | PASS |
| C19 | limit 2, `b` LRU -> disconnect `b`, remove, then create `d` | batched VU, passed at e122bdff5 | verified at e122bdff5 (lines +2): `apps/studio/tests/vitest/unit/handlers/clientLifecycle.spec.ts:78` - `b.disconnect).toHaveBeenCalledTimes(1)`; `:79` - `cache["b"]).toBeUndefined()`; `:80` - `cache["c"]).toBeDefined()`; `:82-83` - destroy before create `d`. The new pending count (`handlerState.ts:214`) does not change this sequential path. | PASS |
| C20 | none idle -> rejects with message containing `"2"`, no create for `d` | batched VU, passed at e122bdff5 | verified at e122bdff5: `clientLifecycle.spec.ts:92` - `rejects.toThrow(/2/)`; `:93` - `createConnection).not.toHaveBeenCalledWith("d")`. The message is now at `handlerState.ts:219`, and its only digit is the limit. | PASS |
| C21 | idle 5001 ms evicted, 4000 ms kept | batched VU, passed at e122bdff5 | verified at e122bdff5: `clientLifecycle.spec.ts:103-104` set the last-use times; `:108` - `b.disconnect).toHaveBeenCalledTimes(1)`; `:109` - `cache["b"]).toBeUndefined()`; `:110` - `c.disconnect).not.toHaveBeenCalled()`; `:111` - `cache["c"]).toBe(c)` | PASS |
| C22 | sweep and limit never evict active / reserved / in-transaction | batched VU, passed at e122bdff5 | verified at e122bdff5: `clientLifecycle.spec.ts:126-128` - `active`, `b` (reserved) and `c` (real `conn/startTransaction`) `.disconnect).not.toHaveBeenCalled()`; `:131` - limit `rejects.toThrow(/2/)`; `:132` - `active.disconnect).not.toHaveBeenCalled()`. `clientBusy` (`handlerState.ts:174-178`) now also counts running queries. That makes it stricter and does not weaken the claim. | PASS |
| C23 | evicted `b` recreated and `listTables` resolves | batched VU, passed at e122bdff5 | verified at e122bdff5: `clientLifecycle.spec.ts:139` - `cache["b"]).toBeUndefined()`; `:143` - `createConnection).toHaveBeenCalledTimes(2)`; `:144` - `tables).toEqual([{ name: "b_table" }])` | PASS |
| C24 | after `conn/disconnect`, 10x sweep interval -> no disconnect | batched VU, passed at e122bdff5 | verified at e122bdff5: `clientLifecycle.spec.ts:156` - `destroyConnection).not.toHaveBeenCalled()`; `:157` - `disconnects()).toBe(before)`; `:158` - `clientSweep).toBeNull()`. `connHandlers.ts:305` `stopClientSweep(sId)` is unchanged. | PASS |
| C25 | limit and sweep eviction keep the tunnel | batched VU, passed at e122bdff5 | verified at e122bdff5: `clientLifecycle.spec.ts:169-170` - `destroyConnection` called with `"b"` and `"c"`; `:171` - `sshTunnel).toBe(tunnel)`; `:172` - `shutdown).not.toHaveBeenCalled()` | PASS |
| C26 | `[db.default] maxOpenDatabases = 5`, `idleDatabaseTimeout = 600000`, both typed | grep verbatim at e122bdff5, exit 0 | carried from 3e5c0d68c, re-grepped at e122bdff5 with the same output: `apps/studio/default.config.ini:113` - `maxOpenDatabases = 5`; `:117` - `idleDatabaseTimeout = 600000 ; 10 Minutes`; `apps/studio/src/typings/bksConfig.d.ts` - 27 occurrences each | PASS |
| C27 | migration registered, `ALTER TABLE ... "databaseName" varchar NULL`, in both `pickable` | grep verbatim at e122bdff5, exit 0 | carried from 3e5c0d68c, re-grepped at e122bdff5 with the same output: `apps/studio/src/migration/20261015_add_tab_database_name.js:5`; `src/migration/index.js:100`; `src/common/appdb/models/OpenTab.ts:11` and `src/common/transport/TransportOpenTab.ts:12` - `pickable` includes `'databaseName'` | PASS |
| C28 | table + table-properties from `b` -> `databaseName:"b"`, saved | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/store/tabDatabase.spec.ts:61` - `[["table", "b"], ["table-properties", "b"]]`; `:66` - `saved.args.obj.databaseName).toBe("b")` | PASS |
| C29 | `connectionForTab` with `b` sends `database:"b"`; `null` -> default | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `tabDatabase.spec.ts:76` - `{ database: "b" }`; `:78` - `toBe(connection)` | PASS |
| C30 | new query tab persists `databaseName:"a"` | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `tabDatabase.spec.ts:88` - `databaseName).toBe("a")` | PASS |
| C31 | after `changeDatabase("c")`, `b` tab still resolves and sends `b` | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `tabDatabase.spec.ts:102` - `database).toBe("c")`; `:104` - `tablesFor("b")`; `:107` - `{ database: "b" }` | PASS |
| C32 | `matches` false for `a` vs `b`; true for `null` vs default `a` | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/transport/TransportOpenTab.spec.ts:10` - `toBe(false)`; `:13` - `toBe(true)` | PASS |
| C33 | selector writes tab `databaseName`, next run sends it; selector `disabled` while transaction / reserved | batched VU, both passed at e122bdff5 | verified at e122bdff5 (re-judged). The lock decision now lives in the selector (`apps/studio/src/components/editor/QueryDatabaseSelector.vue:39-41` `locked`, `:50` guard). The editor only forwards raw state (`apps/studio/src/components/TabQueryEditor.vue:103-106`). Change: `apps/studio/tests/vitest/unit/components/QueryDatabaseSelector.spec.ts:48` - `tab.databaseName).toBe("b")` through a real DOM `change`; `:54` - `dispatch).toHaveBeenCalledWith("tabs/save", tab)`; `:64` - `toMatchObject({ database: "b" })` through the editor's real `connection` computed. Disabled: `:75` - `attributes("disabled")).toBe("disabled")` for `hasActiveTransaction` and then for `isManualCommit`; `:79-80` - a forced change leaves `"a"` and emits nothing; `:84` - not disabled when idle. A lock on only one of the two flags fails the loop, and so does a lock with no write guard. | PASS |
| C34 | transaction timeout rolls back on client `b`, not active | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `connectionFor.spec.ts:133` - `b.rollbackTransaction).toHaveBeenCalledWith(7)`; `:134` - `active.rollbackTransaction).toHaveBeenCalledTimes(0)`. verified at e122bdff5: `connHandlers.ts:390` still passes the resolved `connection` to `createOrResetTransactionTimeout`. | PASS |
| C35 | tab bound to `b`, table missing in `b` -> not-found text | batched VU, passed at e122bdff5 | carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:33` - `toContain("This table does not exist in the selected database")`; `:34` - `.table-slot").exists()).toBe(false)` | PASS |
| C36 | 1 table item whose title includes the database name and `orders`, plus 2 database items | batched VU, passed at e122bdff5 | verified at e122bdff5 (re-judged): the other database is now named `warehouse` (`apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:7,10`). `:24` - `otherTables).toHaveLength(1)`; `:25` - `title).toContain("warehouse")`, which `"public.orders"` cannot satisfy; `:26` - `toContain("orders")`; `:28` - the default database's title is exactly `"public.users"`; `:31` - `databases).toEqual(["a", "warehouse"])`. Source: `apps/studio/src/store/modules/SearchModule.ts:103` `${database} · ${name}`. | PASS |
| C37 | table result emits `loadTable` with `database:"b"`; database result expands, 0 `changeDatabase` | batched VU, both passed at e122bdff5 | carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/components/QuickSearch.spec.ts:21` - `{ table, database: "b" }`; `:28` - `expandDatabase, "b"`; `:30` - `changeDatabase` count 0 | PASS |
| C38 | query tab `databaseName "b"` shows `b` in header and selector; default `a` shows `a` in both | batched VU, both passed at e122bdff5 | verified at e122bdff5 (re-judged). The selector half is now driven by the tab: `QueryDatabaseSelector.spec.ts:35` - a tab with `databaseName: "b"` selects `"b"`; `:36` - `"a"` selects `"a"`; `:38` - `databaseName: null` falls back to store default `"a"`. The selector computes this itself (`QueryDatabaseSelector.vue:35-37`), and the editor passes `:tab="tab"` (`TabQueryEditor.vue:103`). Header half, carried from 3e5c0d68c: `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:28` - `.tab-database").text()).toBe("b")`; `:31` - `.toBe("a")` | PASS |

### Swept `existing` re-read (carried from 3e5c0d68c, citation refreshed at e122bdff5)

- authorization: `existing - the database's own permissions`. `connectionFor` still destroys the
  client and rethrows the driver error unchanged (`apps/studio/src/handlers/handlerState.ts:143-145`).
  C3 and C14 surface that error to the caller.

### Round 1 out-of-check risks (verified at e122bdff5)

1. **Parallel opens exceeding `maxOpenDatabases`**: addressed. `makeRoomForClient` now counts
   `open.length + s.pendingClients.size` (`handlerState.ts:214`). Covered by
   `clientLifecycle.spec.ts:175-182` `parallel opens of different databases respect the limit`
   (`:181` `open.length).toBeLessThanOrEqual(2)`). By trace, the old check would have kept `b`, `c`
   and `d` open (3 > 2), because `d` sees `c` only as pending. So the test discriminates.
2. **Running queries evictable**: addressed. `conn/query` records the client
   (`connHandlers.ts:389`), `clientBusy` treats it as busy (`handlerState.ts:176`), and
   `query/execute` releases it in a `finally` and restarts its idle clock
   (`apps/studio/src/handlers/queryHandlers.ts:20-28`). `query/cancel` clears it (`:50`). Covered by
   `clientLifecycle.spec.ts:184-199`: `:193` - `b.disconnect).not.toHaveBeenCalled()` after a sweep
   with last-use 0, and `:198` - the idle clock restarts when the query ends.

Neither risk is a numbered check. Both now have a passing test that the old code would fail.

## Gate

- `yarn vitest:unit <13 proof files> -t "<39 proof names + 2 risk tests>" --reporter=verbose`: 41 passed, 0 failed, 1 skipped (not a proof). Exit 0, at e122bdff5.
- `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists tables of a non-active database"`: 1 passed, 0 failed. Exit 0, at e122bdff5.
- C26 and C27 grep proofs: exit 0, at e122bdff5.
- `yarn vitest:unit` (full unit config): 51 files, 2684 passed, 0 failed, 1 todo. Exit 0, at e122bdff5.

Non-blocking observations:
- C33/C38: the editor-to-selector prop forwarding (`TabQueryEditor.vue:103-105`) is shown by
  citation, not executed. A test that left out `:has-active-transaction` would still pass. Every
  decision now sits in the selector and is executed, so all that remains unexecuted is plain prop
  forwarding.
- `queryClients` is released only by `query/execute` or `query/cancel`. A query id that is created
  by `conn/query` and never executed or cancelled would leave its client permanently busy, so it
  could never be evicted. This is a leak that fails safe, but it is a leak.
- `queryClients` also records active-database queries. That is harmless, because the active client
  is never evictable.
