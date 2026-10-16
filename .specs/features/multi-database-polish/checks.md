# Multi-database polish checks

Profile: standard
Plan: `.specs/features/multi-database-polish/plan.md`

32 checks in 4 slices · 5 one-way doors · 0 open

Every proof runs from `apps/studio/`. `VU` = `yarn vitest:unit` and `VI` = `yarn vitest:integration`, which needs Docker.

## Checks

### S1 - locked databases · 12 files · 297 KB · ~74k

**C1** - On Postgres, a role without `CONNECT` on database `secret` gets a `listInaccessibleDatabases()` result that contains `secret` and not `a`, the database the role connects to (AC 1, door 2) ✅
Proof: `VI tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists databases the role cannot connect to"`

**C2** - `SQLServerClient.listInaccessibleDatabases()` runs SQL that contains `HAS_DBACCESS(name) = 0` and returns the `name` of each returned row (AC 2) ✅
Proof: `VU tests/vitest/unit/lib/db/inaccessibleDatabases.spec.ts -t "sql server lists names without db access"`
Proof: `VI tests/vitest/integration/lib/db/sqlserverInaccessible.spec.ts -t "sql server lists databases the login has no access to"`

**C3** - A client that doesn't override it (e.g. MySQL) returns `[]` from `listInaccessibleDatabases()` (AC 3) ✅
Proof: `VU tests/vitest/unit/lib/db/inaccessibleDatabases.spec.ts -t "default is an empty list"`

**C4** - `connectionFor` rejects with `code === "DATABASE_ACCESS_DENIED"` for each of 4 connect errors: Postgres `code 42501`, MySQL `errno 1044`, SQL Server `number 916` and `number 4060`. The table-driven test covers all 4 (AC 4, door 3) ✅
Proof: `VU tests/vitest/unit/handlers/accessDenied.spec.ts -t "driver access-denied errors become DATABASE_ACCESS_DENIED"`

**C5** - A connect error with Postgres `code 28P01` (bad password) is rethrown as the same error object, without `DATABASE_ACCESS_DENIED` (AC 5) ✅
Proof: `VU tests/vitest/unit/handlers/accessDenied.spec.ts -t "other errors pass through unchanged"`

**C6** - When a utility reply has `type: "error"` and `errorCode: "DATABASE_ACCESS_DENIED"`, the promise from `UtilityConnection.send` rejects with an `Error` whose `code` is `DATABASE_ACCESS_DENIED` (AC 6) ✅
Proof: `VU tests/vitest/unit/lib/utility/UtilityConnection.spec.ts -t "keeps the error code"`

**C7** - When `conn/listInaccessibleDatabases` returns `["secret"]`, `updateDatabaseList` sets `inaccessibleDatabases` to `["secret"]`. When it rejects, it sets `[]` and `databaseList` is still committed (AC 7) ✅
Proof: `VU tests/vitest/unit/store/databaseEntities.spec.ts -t "database list records inaccessible databases"`
Proof: `VU tests/vitest/unit/handlers/accessDenied.spec.ts -t "the utility lists inaccessible databases from the active client"`

**C8** - When `conn/listTables` for `b` rejects with `code DATABASE_ACCESS_DENIED`, `loadDatabaseEntities("b")` leaves `"b"` in `inaccessibleDatabases` (AC 8) ✅
Proof: `VU tests/vitest/unit/store/databaseEntities.spec.ts -t "access denied on load locks the database"`

**C9** - With `"b"` inaccessible, the `b` row has class `locked`, a `.lock-icon` element, `aria-disabled="true"` and `tabindex="0"`, and expanding it dispatches `loadDatabaseEntities` 0 times (AC 9) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "locked database is dimmed and does not expand"`

**C10** - The locked `b` row's tooltip binding has content `No permission to access database b with the current account (app_user)` and trigger `hover focus`. With no username, the content is `No permission to access database b with the current account` (AC 10) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "locked database explains why on hover and focus"`

**C11** - After `clearConnection`, `inaccessibleDatabases` is `[]` (AC 11) ✅
Proof: `VU tests/vitest/unit/store/databaseEntities.spec.ts -t "disconnect clears databaseEntities"`

**C12** - With `"b"` inaccessible and `b` holding loaded tables, the `search/database` index has 0 items whose `database` or database-item name is `b` (AC 12) ✅
Proof: `VU tests/vitest/unit/store/SearchModule.spec.ts -t "locked databases are not indexed"`

**C13** - A tab bound to inaccessible `b` renders `No permission to access database b with the current account` and no table slot (AC 13) ✅
Proof: `VU tests/vitest/unit/components/TabWithTable.spec.ts -t "locked database shows the permission message"`

### S2 - database colors · 7 files · 35 KB · ~9k

**C14** - Migration `20261016_create_database_labels` creates table `database_labels` with unique index `database_labels_connection_database` on `(connectionId, workspaceId, databaseName)`. Saving the color of `(1, -1, "b")` twice through the label handler leaves 1 row holding the second color (AC 14, door 1) ✅
Proof: `grep -n "CREATE UNIQUE INDEX database_labels_connection_database ON database_labels (connectionId, workspaceId, databaseName)" src/migration/20261016_create_database_labels.js && grep -n "create_database_labels" src/migration/index.js`
Proof: `VU tests/vitest/unit/common/appdb/databaseLabels.spec.ts -t "one row per connection workspace and database"`

**C15** - Choosing `purple` for `b` dispatches the save with `{ databaseName: "b", color: "purple" }`, and the `b` node's label bar has class `connection-label-color-purple` (AC 15) ✅
Proof: `VU tests/vitest/unit/store/databaseLabels.spec.ts -t "setting a color saves it"`
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "database label bar shows its color"`
Proof: `VU tests/vitest/unit/components/databaseColorFlow.spec.ts -t "the database menu opens the color modal"`
Proof: `VU tests/vitest/unit/components/databaseColorFlow.spec.ts -t "the color modal saves the picked color"`
Proof: `VU tests/vitest/unit/components/databaseColorFlow.spec.ts -t "the entity tree mounts the color modal"`

**C16** - Choosing `default` for `b` sends `appdb/databaseLabels/remove` for its row, and the bar has no `connection-label-color-` class (AC 16) ✅
Proof: `VU tests/vitest/unit/store/databaseLabels.spec.ts -t "default removes the color"`
Proof: `VU tests/vitest/unit/components/VirtualTableList.spec.ts -t "database label bar shows its color"`
Proof: `VU tests/vitest/unit/components/databaseColorFlow.spec.ts -t "the color modal removes the color with default"`

**C17** - A tab on `b` (purple) has a `.tab-color-stripe` and `.tab-database` with class `connection-label-color-purple`. A tab on the default database `a` (green) has `connection-label-color-green` (AC 17) ✅
Proof: `VU tests/vitest/unit/components/CoreTabHeader.spec.ts -t "tab shows its database color"`

**C18** - On a connection with `id: null`, setting `b` to `purple` updates `databaseLabels` in the store and sends 0 `appdb/databaseLabels/*` requests (AC 18) ✅
Proof: `VU tests/vitest/unit/store/databaseLabels.spec.ts -t "unsaved connection keeps colors in the session"`

**C19** - `loadDatabaseLabels` for connection `{ id: 3, workspaceId: -1 }` sends `appdb/databaseLabels/find` with `where { connectionId: 3, workspaceId: -1 }` and stores the result (AC 19) ✅
Proof: `VU tests/vitest/unit/store/databaseLabels.spec.ts -t "loads labels of the connection"`
Proof: `VU tests/vitest/unit/components/databaseColorFlow.spec.ts -t "loads the colors of the connection"`

### S3 - reveal the active tab's table · 4 files · 47 KB · ~12k

**C20** - `sidebarKeyForTab` for a `table` tab on `public.users` with `databaseName "b"` (default `a`) returns `b::table.public.users`. For the same tab on `a` it returns `table.public.users`. When that tab becomes active, `CoreTabHeader` commits `selectSidebarItem` with that key (AC 20) ✅
Proof: `VU tests/vitest/unit/components/revealActiveEntity.spec.ts -t "selection key includes the tab database"`

**C21** - `sidebarKeyForTab` for a tab with `entityType "view"` on `public.v` in the default database returns `view.public.v` (AC 21) ✅
Proof: `VU tests/vitest/unit/components/revealActiveEntity.spec.ts -t "selection key uses the entity type"`

**C22** - With `revealActiveEntity` true, selecting `b::table.public.users` while `b` is collapsed sets `b` and its `public` schema `expanded`, dispatches `loadDatabaseEntities` for `b` if it isn't loaded, and calls `scrollToIndex` with that item's index in `displayItems` (AC 22) ✅
Proof: `VU tests/vitest/unit/components/revealActiveEntity.spec.ts -t "reveals the selected table in its database"`

**C23** - With `revealActiveEntity` false, the same selection changes no item's `expanded` and calls `scrollToIndex` 0 times (AC 23) ✅
Proof: `VU tests/vitest/unit/components/revealActiveEntity.spec.ts -t "reveal can be turned off"`

**C24** - `default.config.ini` `[ui.tableList]` declares `revealActiveEntity = true`, and `bksConfig.d.ts` types it (AC 24, door 4) ✅
Proof: `grep -nE "^revealActiveEntity = true" default.config.ini && grep -c "revealActiveEntity" src/typings/bksConfig.d.ts`

### S4 - plugin API · 2 files · 27 KB · ~7k

**C25** - With databases `["a","b","c"]`, default `a`, `b` inaccessible and `c` purple, `getDatabases` returns 3 entries: `a {isDefault: true, accessible: true, color: null}`, `b {isDefault: false, accessible: false, color: null}`, `c {isDefault: false, accessible: true, color: "purple"}` (AC 25, door 5) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "getDatabases lists every database"`

**C26** - With a dialect that sets `multipleDatabases` disabled, `getDatabases` returns `[]` (AC 26) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "getDatabases is empty without multiple databases"`

**C27** - `runQuery("select 1", "b")` sends `conn/executeQuery` with `database: "b"`. `runQuery("select 1")` sends it with no `database` key (AC 27) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "runQuery runs on the given database"`

**C28** - Serializing a `query` tab with `databaseName "b"` gives `databaseName: "b"`, and one with `null` gives the default `a`. A `table` tab on `b`'s `orders` gives `data.table` equal to `b`'s `orders` entity, and `databaseName: "b"` (AC 28) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "serialized tabs carry their database"`

**C29** - `getConnectionInfo().databaseName` is `a`, the default database, while the active tab is on `b` (AC 29) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "connection info keeps the default database"`

**C30** - The plugin bridge (`WebPluginLoader`) answers a `getDatabases` request with `pluginStore.getDatabases()`, and passes `args.database` to `pluginStore.runQuery` (door 5) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "bridge routes the new requests"`

**C31** - Disconnected (no connection), `getDatabases` rejects with the `noDatabase` message (Surface outcome) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "getDatabases rejects when disconnected"`

**C32** - `runQuery` on a locked database rejects with `code DATABASE_ACCESS_DENIED` when the utility returns it (Surface outcome) ✅
Proof: `VU tests/vitest/unit/services/pluginDatabases.spec.ts -t "runQuery on a locked database rejects with the access code"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| plan Landing doors (5) | door 1 C14 · door 2 C1 · door 3 C4 · door 4 C24 · door 5 C25 | - |
| driver access-denied codes (4) | C4, table-driven over all 4 (42501, 1044, 916, 4060) | - |
| privilege listing per dialect (3) | Postgres family C1 · SQL Server C2 · others C3 | - |
| lock sources (2) | proactive list C7 · error on load C8 | - |
| locked node attributes (4) | class C9 · icon C9 · aria-disabled C9 · tabindex C9 | - |
| tooltip triggers (2) | hover C10 · focus C10 | - |
| places a lock shows (3) | tree C9 · Quick Search C12 · tab C13 | - |
| color places (2) | tree C15 · tab C17 | - |
| color operations (3) | set C15 · remove C16 · load C19 | - |
| selection key parts (2) | database prefix C20 · entity type C21 | - |
| reveal config values (2) | true C22 · false C23 | - |
| `getDatabases` outcomes (3) | resolves list C25 · resolves [] C26 · rejects noDatabase C31 | - |
| `runQuery` outcomes (3) | resolves on database C27 · rejects driver error C27 · rejects DATABASE_ACCESS_DENIED C32 | - |
| startup config: revealActiveEntity (2 places) | `default.config.ini` C24 · `bksConfig.d.ts` C24 | - |

- Claims naming an IPC payload or error code: C4, C6, C8, C19, C27, C32. Each proof asserts the sent payload or the rejected code.
- C1 is the only proof against a real database.

## Test policy

The repo's guidelines say where tests live and which runner to use (CLAUDE.md: new tests are Vitest specs under `tests/vitest/`). They don't say which level proves which code, or how much of the input space a proof must assert. These rows answer both for this feature. They are not written into the repo's guidelines; they apply to this feature only.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary (IPC route, plugin bridge, database) | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row of the decision table at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Wiring that decides nothing (prop pass-through, event binding, dispatch on mount, modal submit) | one proof that goes through the wiring | the wiring exercised once, from the user action or event the claim starts at |
| Instrumentation (one forwarded call, no conditional) | none of its own | covered by its consumer's proof |

Evidence:

- `src/lib/db/accessDenied.ts`: maps 5 driver codes (42501, 1044, ER_DBACCESS_DENIED_ERROR, 916, 4060) to one outcome → decides. Proven at its own layer by C4, table-driven.
- `handlerState.connectionFor` catch: 2 branches (access denied → rethrow with code, else rethrow as is) → decides, reached across IPC. Own layer C4/C5; the code reaching the renderer is C6.
- `PostgresClient` / `SQLServerClient.listInaccessibleDatabases`: SQL against a database → decides, reached across the database boundary. Real Postgres C1. SQL Server C2 has both a real container (`sqlserverInaccessible.spec.ts`) and its own layer. The first draft said the suite had no SQL Server container, which was wrong; the jest suite already starts one, and verification round 3 caught it.
- `conn/listInaccessibleDatabases` handler and `ElectronUtilityConnectionClient.listInaccessibleDatabases`: one forwarded call → instrumentation, covered by C7.
- store `updateDatabaseList` / `loadDatabaseEntities` lock logic: 3 branches (listed, list failed, load denied) → decides. C7, C8.
- `VirtualTableList` database node: locked, color, reveal on/off, load on expand → decides. C9, C10, C15, C16, C22, C23.
- `DatabaseLabelModule.setColor`: 3 branches (default, unsaved connection, saved connection) → decides, reached across appdb IPC. C15, C16, C18; appdb layer C14.
- `DatabaseLabel.setColor`: 2 branches (row exists, new row) → decides. C14.
- `sidebarKeyForTab`: 2 decisions (database prefix, entity type) → decides. C20, C21.
- `PluginStoreService.getDatabases` / `runQuery` / `serializeTab`: decides over databases, access, colors and tab type, reached across the plugin bridge. Own layer C25-C29; bridge C30-C32.
- Wiring: `Item.vue` props to `StatelessDatabaseItem`, `CoreTabHeader` → `revealSidebarItem`, `CoreInterface` → `databaseLabels/load`, `DatabaseColorModal` submit and its mount in `TableList`, the "Set color" menu entry. Each is proven once through the wiring (C9, C22, C19, C15).
- Closest analogue in the repo: `tests/vitest/unit/handlers/driverHandlerNullConnection.spec.ts`. It is the same shape (a handler decision proven at its own layer with a stubbed connection).

Cost: 4 wiring proofs and 1 boundary proof beyond the original set, all already added in verification rounds 1 and 2.

## Swept

- validation: C3, C26 (dialects without the feature return empty lists)
- failure modes: C5, C7 (a failing privilege query leaves the list working), C13
- idempotency: C14 (a repeated color save keeps one row)
- authorization: C1, C4, C9 (the feature is about the server's own permissions)
- concurrency: n/a - a locked state only flips on a failed or listed connect, and colors are single-writer per window
- data lifecycle: C11, C16, C18
- dependency failure: C7, C32
- state transitions: C8 (loading → locked), C16 (colored → none)
- observability: n/a - no logging requirement in the plan

## Handoff

Size from `wc -c` on the files each slice touches, divided by 4:

- S1 = 297 KB ≈ 74k (`postgresql.ts` and `sqlserver.ts` are most of it)
- S2 adds ≈ 9k → 83k
- S3 adds ≈ 12k → 95k
- S4 adds ≈ 7k → 102k
- Test templates add ≈ 8k, for **≈ 110k, under the 150k budget**
- Mechanism: one builder, no ask (the estimate fits)

- **Boundary:** C1-C32 closed at `bda383924`
- **Settled mid-build:** verification rounds 1 and 2 found wiring with no proof: the reveal event, the color modal's open, save and mount, label loading on connect, the utility privilege route, and errno-only MySQL matching. Proof lines were added to C7, C15, C16 and C19 for the tests that now cover it. Existing proofs and claims are unchanged.
- **Abandoned:** none
- **Settled after round 3:** the SQL Server boundary proof was added to C2. Closing a tab now clears the sidebar selection with `sidebarKeyForTab` (`closedTabWasSelected` in `sidebarKey.ts`, called from `CoreTabs.close`). Before, it still built the old key and left a stale selection for tabs on other databases, views and structure tabs. Covered by `revealActiveEntity.spec.ts` "clears the selection of a closed tab in another database".
- **Profile:** raised from `light` to `standard` by the user on 2026-10-16, after verification rounds kept injecting faults beyond the light profile. `standard` bounds fault injection to one per assertion surface, at most 5.
