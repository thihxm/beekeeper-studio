# Multi-database navigation checks

Profile: light
Plan: `.specs/features/multi-database-navigation/plan.md`

38 checks in 4 slices · 3 one-way doors · 0 open

Every proof runs from `apps/studio/`. `VU` = `yarn vitest:unit` and `VI` = `yarn vitest:integration`, which is the same runner with `vitest.integration.config.mjs` and needs Docker through `testcontainers`. Both scripts already exist in `package.json`. All new specs are Vitest, as CLAUDE.md requires.

## Checks

Slices follow the build order: S1, then S4 (which sits on `connectionFor`), then S2, then S3. Numbering follows that order.

### S1 - database tree in the sidebar · 10 files · 154 KB · ~38k

**C1** - `connectionFor(sId, null)` and `connectionFor(sId, <active database>)` both return `state(sId).connection`, and `server.createConnection` is called 0 times (AC 7) ✅
Proof: `VU tests/vitest/unit/handlers/connectionFor.spec.ts -t "returns the active connection for null and the active database"`

**C2** - Two `connectionFor(sId, "b")` calls with `"b"` not active call `server.createConnection("b")` once and `connect()` once, and both return the same client (AC 8) ✅
Proof: `VU tests/vitest/unit/handlers/connectionFor.spec.ts -t "creates a non-active client once and reuses it"`

**C3** - IF `connect()` rejects for database `"b"` THEN `connectionFor` rejects with that same error, and `server.db["b"]` is `undefined` afterwards (AC 4, utility half) ✅
Proof: `VU tests/vitest/unit/handlers/connectionFor.spec.ts -t "failed connect drops the client and rethrows"`

**C4** - Disconnecting one client with `BasicDatabaseClient.disconnect()` leaves `server.sshTunnel` non-null and does not call its `shutdown` (AC 9, first half) ✅
Proof: `VU tests/vitest/unit/lib/db/serverClientCache.spec.ts -t "disconnecting one client keeps the ssh tunnel"`

**C5** - The `conn/disconnect` handler calls `disconnect()` on every client in `server.db` (2 of 2 in the fixture) and leaves `server.sshTunnel === null` (AC 9, second half) ✅
Proof: `VU tests/vitest/unit/handlers/connectionFor.spec.ts -t "conn/disconnect ends every cached client and the tunnel"`

**C6** - For a SurrealDB server, `createConnection("ns::db")` called twice returns the same client, and the cache key is `"ns::db"` (Impact, SurrealDB leak) ✅
Proof: `VU tests/vitest/unit/lib/db/serverClientCache.spec.ts -t "surrealdb client is cached under ns::db"`

**C7** - A client built with `connection.forDatabase("b")` sends `database: "b"` on `conn/listTables`, `conn/listViews`, `conn/listRoutines` and `conn/query`. The plain `connection` sends no `database` key on the same 4 calls (door 2) ✅
Proof: `VU tests/vitest/unit/lib/utility/ElectronUtilityConnectionClient.spec.ts -t "forDatabase injects database on every call"`
Proof: `VU tests/vitest/unit/lib/utility/ElectronUtilityConnectionClient.spec.ts -t "default client sends no database"`

**C8** - The `conn/listTables` handler called with `{ database: "b" }` invokes `listTables` on `server.db["b"]` and not on `state.connection` (door 2, utility half) ✅
Proof: `VU tests/vitest/unit/handlers/connectionFor.spec.ts -t "conn handlers route by database"`

**C9** - Dispatching `loadDatabaseEntities("b")` twice sends `conn/listTables` with `database: "b"` exactly once. Afterwards `databaseEntities.b.status === "loaded"`, and `tablesFor("b")` returns the fixture tables of `b` (AC 2, store half) ✅
Proof: `VU tests/vitest/unit/store/databaseEntities.spec.ts -t "loads a database once and caches it"`

**C10** - While `conn/listTables` is pending for `b`, `databaseEntities.b.status === "loading"`. After a rejection, it is `"error"` and `error` carries the driver message (AC 3, AC 4, store half) ✅
Proof: `VU tests/vitest/unit/store/databaseEntities.spec.ts -t "tracks loading and error status"`

**C11** - The store's `disconnect` action leaves `databaseEntities` equal to `{}` (AC 10) ✅
Proof: `VU tests/vitest/unit/store/databaseEntities.spec.ts -t "disconnect clears databaseEntities"`

**C12** - `VirtualTableList` mounted with `databaseList = ["a","b","c"]`, default `a`, and a dialect without `multipleDatabases` disabled renders 3 database rows, with `a` expanded and showing its tables, and `b` and `c` collapsed (AC 1) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "renders one node per database with the default expanded"`

**C13** - Expanding collapsed `b` dispatches `loadDatabaseEntities` with `"b"` once, and after load its schema and table rows render under `b` (AC 2, UI half) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "expanding a database loads it once"`

**C14** - A `b` node with status `"loading"` renders a loading indicator. A `b` node with status `"error"` renders the error message and a retry control, and clicking retry dispatches `loadDatabaseEntities("b")` again (AC 3, AC 4, UI half) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "shows loading and error with retry"`

**C15** - With database `a` and schema `public` both expanded, collapsing `a` leaves 0 rendered rows whose ancestor is `a` (AC 5) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "collapsing a database hides every descendant"`

**C16** - With a dialect whose `disabledFeatures.multipleDatabases === true`, 0 database rows render, and schemas are top-level as today (AC 6) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "no database level when multipleDatabases is disabled"`

**C17** - A pin with `databaseName "b"` on `public.users` renders as pinned only under `b`, not under `a`, which also has `public.users`. A hidden entity with `databaseName "b"` is hidden only under `b` (AC 11) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "pins and hidden entities apply per database"`

**C18** - Against a real Postgres container with databases `a` (table `ta`) and `b` (table `tb`), `connectionFor(sId, "b").listTables()` returns `tb` and not `ta`, while `state.connection` stays on `a` (AC 2, end to end) ✅
Proof: `VI tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists tables of a non-active database"`

### S4 - bounded clients with transparent recreate · 4 files · 37 KB · ~9k

**C19** - With `maxOpenDatabases = 2`, non-default clients `b` and `c` open and idle, and `b` least recently used, `connectionFor("d")` disconnects `b`, removes it from `server.db`, then creates `d` (AC 25)
Proof: `VU tests/vitest/unit/handlers/clientLifecycle.spec.ts -t "evicts the least recently used idle client at the limit"`

**C20** - With `maxOpenDatabases = 2` and both `b` and `c` holding a reserved connection, `connectionFor("d")` rejects with a message containing `"2"`, and `createConnection` is not called for `d` (AC 26)
Proof: `VU tests/vitest/unit/handlers/clientLifecycle.spec.ts -t "rejects at the limit when no client is idle"`

**C21** - With `idleDatabaseTimeout = 5000` and fake timers, a non-default client unused for 5001 ms is disconnected and removed by the sweep. One used 4000 ms ago is kept (AC 27)
Proof: `VU tests/vitest/unit/handlers/clientLifecycle.spec.ts -t "sweep disconnects clients idle past the timeout"`

**C22** - Neither the sweep nor the limit evicts 3 kinds of client: the active database's client, a client with a reserved connection, or a client with an open transaction (AC 28)
Proof: `VU tests/vitest/unit/handlers/clientLifecycle.spec.ts -t "never evicts active reserved or in-transaction clients"`

**C23** - After `b` is evicted, `connectionFor("b")` creates a new client and a following `listTables` resolves (AC 29)
Proof: `VU tests/vitest/unit/handlers/clientLifecycle.spec.ts -t "an evicted database is recreated on next use"`

**C24** - After `conn/disconnect`, advancing fake timers by 10 × the sweep interval calls `disconnect` on no client (AC 30)
Proof: `VU tests/vitest/unit/handlers/clientLifecycle.spec.ts -t "disconnect clears the sweep timer"`

**C25** - Evicting a client by limit and by sweep leaves `server.sshTunnel` non-null (AC 31)
Proof: `VU tests/vitest/unit/handlers/clientLifecycle.spec.ts -t "eviction keeps the ssh tunnel"`

**C26** - `default.config.ini` `[db.default]` declares `maxOpenDatabases = 5` and `idleDatabaseTimeout = 600000`, and `bksConfig.d.ts` types both keys (door 3)
Proof: `grep -nE "^maxOpenDatabases = 5" default.config.ini && grep -nE "^idleDatabaseTimeout = 600000" default.config.ini && grep -c "maxOpenDatabases" src/typings/bksConfig.d.ts && grep -c "idleDatabaseTimeout" src/typings/bksConfig.d.ts`

### S2 - tabs bound to their database · 14 files · 272 KB · ~68k

**C27** - Migration `20261015_add_tab_database_name` is registered in `realMigrations` and runs `ALTER TABLE tabs ADD COLUMN "databaseName" varchar NULL`. `OpenTab` and `TransportOpenTab` list `databaseName` in `pickable` (door 1)
Proof: `grep -n "ALTER TABLE tabs ADD COLUMN \"databaseName\" varchar NULL" src/migration/20261015_add_tab_database_name.js && grep -n "add_tab_database_name" src/migration/index.js && grep -n "databaseName" src/common/appdb/models/OpenTab.ts src/common/transport/TransportOpenTab.ts`

**C28** - Opening `public.orders` from database `b`, data or structure, produces a tab item with `databaseName: "b"`, and `tabs/add` sends that field to `appdb/tabs/save` (AC 12, persistence half)
Proof: `VU tests/vitest/unit/store/tabDatabase.spec.ts -t "table tab from another database persists databaseName"`

**C29** - `connectionForTab(connection, { databaseName: "b" })` returns a client that sends `database: "b"`. With `databaseName: null` it returns the default `connection` (AC 12 execution half, AC 15)
Proof: `VU tests/vitest/unit/store/tabDatabase.spec.ts -t "tab connection follows databaseName"`

**C30** - A new query tab created while the default database is `a` persists `databaseName: "a"` (AC 13)
Proof: `VU tests/vitest/unit/store/tabDatabase.spec.ts -t "new query tab binds the default database"`

**C31** - After `changeDatabase("c")`, a tab with `databaseName "b"` still resolves its table through `tablesFor("b")`, and its connection still sends `database: "b"` (AC 14)
Proof: `VU tests/vitest/unit/store/tabDatabase.spec.ts -t "bound tabs survive a default database change"`

**C32** - `TransportOpenTab.matches` returns `false` for two `table` tabs on `public.users` with `databaseName` `"a"` and `"b"`, and `true` for `null` vs. the current default when the default is `"a"` (AC 16, AC 15)
Proof: `VU tests/vitest/unit/transport/TransportOpenTab.spec.ts -t "matches compares databaseName"`

**C33** - The query tab database selector writes the chosen database to the tab's `databaseName` and the next execution sends it. While `hasActiveTransaction` or a reserved connection is set, the selector is `disabled` (AC 17, AC 18)
Proof: `VU tests/vitest/unit/components/QueryDatabaseSelector.spec.ts -t "changes the tab database"`
Proof: `VU tests/vitest/unit/components/QueryDatabaseSelector.spec.ts -t "disabled during a transaction or reserved connection"`

**C34** - With a transaction started on client `b` for tab 7, the timeout calls `rollbackTransaction(7)` on client `b` and not on `state.connection` (AC 19)
Proof: `VU tests/vitest/unit/handlers/connectionFor.spec.ts -t "transaction timeout rolls back on the starting client"`

**C35** - `TabWithTable` with a tab bound to `b` whose table is not in `tablesFor("b")` renders "does not exist in the selected database" (AC 20)
Proof: `VU tests/vitest/unit/components/TabWithTable.spec.ts -t "missing table in its database shows the not-found state"`

**C38** - A query tab with `databaseName "b"` shows `b` in its tab header and in the database selector. With `databaseName` equal to the default `a`, both still show `a` (AC 32)
Proof: `VU tests/vitest/unit/components/QueryDatabaseSelector.spec.ts -t "shows the tab database"`
Proof: `VU tests/vitest/unit/components/CoreTabHeader.spec.ts -t "query tab header shows its database"`

### S3 - Quick Search across databases · 3 files · 24 KB · ~6k

**C36** - With `databaseList = ["a","b"]`, default `a`, and `b` loaded with `public.orders`, `search/database` contains 1 table item whose title includes both `b` and `orders`, plus 2 database items, 1 per database (AC 21, AC 22)
Proof: `VU tests/vitest/unit/store/SearchModule.spec.ts -t "indexes loaded databases and every database name"`

**C37** - In `QuickSearch`, submitting the `b · public.orders` result emits `AppEvent.loadTable` with `database: "b"`. Submitting the database `b` emits the expand-and-load event with `"b"`, and `changeDatabase` is dispatched 0 times (AC 23, AC 24)
Proof: `VU tests/vitest/unit/components/QuickSearch.spec.ts -t "table result opens bound to its database"`
Proof: `VU tests/vitest/unit/components/QuickSearch.spec.ts -t "database result expands instead of switching"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| plan Landing doors (3) | door 1 C27 · door 2 C7 · door 3 C26 | - |
| `connectionFor` resolution paths (5) | null C1 · active C1 · cached C2 · create C2 · connect fails C3 | - |
| `conn/*` calls proven to route (4) | `listTables` C7 · `listViews` C7 · `listRoutines` C7 · `query` C7 | - |
| database node states (4) | collapsed C12 · loading C14 · loaded C13 · error C14 | - |
| dialect branch (2) | multipleDatabases enabled C12 · disabled C16 | - |
| per-database entity filters (2) | pins C17 · hidden C17 | - |
| non-evictable clients (3) | active C22 · reserved C22 · in transaction C22 | - |
| eviction triggers (2) | limit C19 · idle sweep C21 | - |
| eviction outcomes at the limit (2) | idle client exists C19 · none idle C20 | - |
| query tab database display places (2) | tab header C38 · editor selector C38 | - |
| tab types bound to a database (3) | table C28 · table-properties C28 · query C30 | - |
| `databaseName` values on a tab (2) | set C29 · null C29 | - |
| Quick Search result kinds touched (2) | table C37 · database C37 | - |
| SSH tunnel close paths (4) | one client disconnect C4 · conn/disconnect C5 · limit eviction C25 · sweep eviction C25 | - |
| startup config: limit keys (2 places) | `default.config.ini` C26 · `bksConfig.d.ts` C26 | - |

- Claims naming an IPC payload key (`database`): C7, C8, C9, C28, C29, C37. Each proof asserts the sent payload.
- C18 is the only proof against a real database. Every other check proves its own layer with doubles, and none claims more than the cases its proof exercises.

## Swept

- validation: C20 (the limit rejects with its value). Database names come from `databaseList`, never typed in, so they need no further sanitisation.
- failure modes: C3, C10, C14, C35
- idempotency: C2, C9 (a repeat expand or call creates no second client or request)
- authorization: existing - the database's own permissions. A denied database surfaces as the driver error in C3/C14.
- concurrency: C2, C31, C33 (a selector locked while a transaction is open), C34
- data lifecycle: C27 (nullable column, no backfill), C11, C21, C24
- dependency failure: C3, C18, C25
- state transitions: C10 (idle→loading→loaded/error), C19, C23 (evicted→recreated)
- observability: n/a - no logging or metric requirement in the plan. Evictions use the existing `log` scope, which no check asserts.

## Handoff

Size from `wc -c` on the files each slice touches, divided by 4. Overlapping files are counted once, in the first slice that touches them.

- S1 = 154 KB ≈ 38k: `server.ts`, `handlerState.ts`, `connHandlers.ts`, `BasicDatabaseClient.ts`, `ElectronUtilityConnectionClient.ts`, `store/index.ts`, `VirtualTableList.vue`, `TableList.vue`, `PinModule.ts`, `HideEntityModule.ts`
- S4 adds `default.config.ini` and `bksConfig.d.ts` (`server.ts` and `handlerState.ts` are already counted) at ≈ 6k → 44k total
- S2 adds 272 KB ≈ 68k: migration + `index.js`, `OpenTab.ts`, `TransportOpenTab.ts`, `TabModule.ts`, `CoreTabs.vue`, `TabWithTable.vue`, `TableTable.vue` (83 KB), `TabTableProperties.vue`, `TableSchema.vue`, `TabQueryEditor.vue` (81 KB) → 112k total
- S3 adds `SearchModule.ts` and `QuickSearch.vue` at ≈ 4k → 116k total
- The test templates (`driverHandlerNullConnection`, `disconnectAfterUtilityRestart`, `NewWorkspaceButton`, `mariadb` integration) add ≈ 4k → **≈ 120k, under the 150k budget**
- Mechanism: one builder, no ask (the estimate fits)
