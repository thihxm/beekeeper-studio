# Saved connections as parent nodes of the entity tree checks

Profile: standard
Plan: `.specs/features/multi-connection-tree/plan.md`

38 checks in 4 slices · 3 one-way doors · 0 open

Every proof runs from `apps/studio/`. `VU` = `yarn vitest:unit`. Test names avoid `'` so a `-t`
selector survives yarn and electron (lesson L-004). Fixtures follow L-001: the same entity name
exists on the window's connection and on the secondary one, so a check that says "on `C`" fails
when the window's copy is used. Fixtures that claim "every entity" include a routine (L-005).

Names used below: window session `w1`; secondary saved connections `C` (id 7, MySQL,
`labelColor: "blue"`, databases `shop` default and `audit`) and `D` (id 9, Postgres,
`labelColor: "default"`); window connection id 3 (Postgres, `labelColor: "red"`, database `a`).

## Checks

### S1 - connection level in the entity tree · 6 files · 45 KB · ~11k

**C1** - With `connectionTreeScope` absent and pins `[9, 7]` (positions 0, 1) for saved connections `{3, 7, 9, 11}`, the tree's connection nodes are, in order, `3` (window), `9`, `7`; `11` (not pinned) and a second `3` are absent (AC 1)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "pinned scope lists pinned connections in pin order"`

**C2** - With `connectionTreeScope = "all"` and saved connections named `beta`, `Alpha`, `gamma` (ids 7, 9, 11) plus the window's own (3), the nodes after the window's are `Alpha`, `beta`, `gamma`, and the list comes from the full saved-connection source, not from `data/connections` items (which hold only `beta` in the fixture) (AC 2)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "all scope lists every saved connection by name"`
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "loads every saved connection of the workspace"`

**C3** - With scope `pinned` and no pins, the tree has 0 connection nodes and the same item keys as before this feature (`database::a`, `database::b`, ...) (AC 3)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "no listed connection renders no connection level"`

**C4** - With one secondary connection listed, the first connection node is the window's, `expanded` true, and today's database items are its descendants (AC 4)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "window connection is first and expanded"`

**C5** - Connection node `C` renders its name and an element with class `connection-label-color-blue`; node `D` (`labelColor: "default"`) renders its name and no `connection-label-color-*` element (AC 5)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "connection nodes show name and saved color"`

**C6** - Choosing each of the 3 Entities-header menu items dispatches `settings/save` with `{ key: "connectionTreeScope", value }` for `off`, `pinned` and `all` respectively, and the tree rebuilds its connection level from the new value without remounting. The test is table-driven over the 3 (AC 6, door 3)
Proof: `VU tests/vitest/unit/components/connectionTreeScopeMenu.spec.ts -t "scope menu saves each value and rebuilds the tree"`

**C7** - After the saved-connection list changes (a pin added, a connection renamed, recolored, created and deleted), the next rebuild shows the change and no `conn/*` message is sent under `w1` (AC 7)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "connection level follows saved connection changes"`

**C8** - With scope `all` and the window connected to an unsaved config (no `id`), plus a used-connection record for an unsaved config, only saved connections appear after the window node (AC 8)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "never lists unsaved connections"`

**C9** - With `connectionTreeScope = "off"` and pins `[7, 9]`, the tree has 0 connection nodes (AC 35)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "off scope hides the connection level"`

### S2 - opening a secondary connection from the tree · 5 files · 78 KB · ~19k

**C10** - The child session key for window `w1` and saved connection 7 is `w1::connection::7`; the utility, receiving a request with that `sId` while `w1` exists, creates a `State` whose `port` is `w1`'s port, and replies on it; a request for `x9::connection::7` with no `x9` session is answered with an error and creates no state (door 1)
Proof: `VU tests/vitest/unit/handlers/childSession.spec.ts -t "creates a child session that shares the window port"`

**C11** - Expanding not-connected node `C` sends `conn/create` with `config.id === 7` and `sId === "w1::connection::7"` exactly once, and every message sent during the expand carries `sId` `w1::connection::7` or is an `appdb/*` lookup - none is sent under `w1` (AC 9)
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "expanding a connection creates it in its own session"`

**C12** - While `conn/create` for `C` is pending, node `C` renders the loading indicator; after it resolves the indicator is gone (AC 10)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "connecting node shows loading"`

**C13** - When `conn/create` for `C` rejects with `ER_ACCESS_DENIED_ERROR: Access denied for user`, node `C` shows that message and a Retry control, retry sends `conn/create` again, and in the utility `state("w1::connection::7").server` is `null` after the failure (AC 11)
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "a failed connect shows the error and can retry"`
Proof: `VU tests/vitest/unit/handlers/childSession.spec.ts -t "a failed create leaves the child session without a server"`

**C14** - After `C` connects with `databaseList = ["audit", "shop"]` and default `shop`, the tree shows database nodes `audit` and `shop` under `C`, `shop` expanded with its tables, `audit` collapsed; for `D`'s dialect with `disabledFeatures.multipleDatabases`, `D`'s schema/table items are direct children of `D` (AC 12)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "connected secondary connection renders its databases"`

**C15** - Expanding `C`'s `audit` sends `conn/listTables` with `sId === "w1::connection::7"` and `database === "audit"` (AC 13)
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "expanding a secondary database lists it in the child session"`

**C16** - Two expands of `C` while its connect is pending send `conn/create` once (AC 14)
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "concurrent expands connect once"`

**C17** - For a CockroachDB saved connection with JWT auth and no password, expanding it calls the same prompt as the connection screen (`BeekeeperPlugin.promptJwtToken`); with the prompt cancelled, no `conn/create` is sent and the node stays collapsed and `idle`; with a token, `conn/create` carries `config.password` equal to the token (AC 15)
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "ephemeral prompt cancel leaves the connection closed"`

**C18** - Choosing "Disconnect" on connected `C` sends `conn/disconnect` then `conn/clearConnection`, both with `sId === "w1::connection::7"`, after which `C` is collapsed and `connectionTree` holds no databases or entities for 7 (AC 16)
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "disconnect closes the child session"`

**C19** - With a tab bound to `C` that has an active transaction (and separately one with a reserved connection), `C`'s "Disconnect" menu item is disabled; with neither, it is enabled (AC 17)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "disconnect is disabled while a tab transaction is open"`

**C20** - With `C` and `D` connected, the store's `disconnect` (and separately `rollbackConnection`) sends `conn/disconnect` for `w1::connection::7` and `w1::connection::9` before the window's own `conn/disconnect`, and `connectionTree` is empty afterwards (AC 18)
Proof: `VU tests/vitest/unit/store/connectionTree.spec.ts -t "window disconnect closes every secondary connection"`

**C21** - Removing window state `w1` (the utility's `close`) removes `w1::connection::7` and `w1::connection::9`, leaves `w2::connection::7` alone, and ends the child servers (AC 19)
Proof: `VU tests/vitest/unit/handlers/childSession.spec.ts -t "closing a window removes its child sessions"`

**C22** - With filter `use`, connected `C` whose `shop` holds `users` and `orders` shows `C › shop › users` without being expanded by hand, hides `orders`, and a loaded `audit` of `C` with no match is hidden (AC 20)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "filter applies to secondary connections"`

### S3 - tabs on a secondary connection · 26 files · 431 KB · ~108k

**C23** - Migration `20261021_add_tab_target_connection_id` is in the app's migration list, and run against a `tabs` table without the column it adds a nullable `targetConnectionId`: an `OpenTab` saved with `targetConnectionId = 7` reads back 7, one saved without it reads back `null` (door 2)
Proof: `VU tests/vitest/unit/common/appdb/tabTargetConnection.spec.ts -t "migration adds a nullable target connection to tabs"`

**C24** - "View Data" on `C`'s `shop.public.users` adds a tab with `targetConnectionId = 7`, `databaseName = "shop"`, and its data load sends `conn/selectTop` under `sId === "w1::connection::7"` with no `database` key; "View Structure" on `C`'s `audit` table sends its column load with `database === "audit"` (AC 21)
Proof: `VU tests/vitest/unit/store/secondaryConnectionTabs.spec.ts -t "entity tabs persist and run on the secondary connection"`

**C25** - "New query" on node `C` opens a query tab with `targetConnectionId = 7` and `databaseName = "shop"`; on `C`'s `audit` node, `databaseName = "audit"`; running it sends `conn/query`, `query/execute` and (on cancel) `query/cancel` all with `sId === "w1::connection::7"` (AC 22)
Proof: `VU tests/vitest/unit/store/secondaryConnectionTabs.spec.ts -t "new query runs and cancels on the secondary connection"`

**C26** - A tab with `targetConnectionId = 42`, which no saved connection of the workspace has, renders `Saved connection not found` and sends no `conn/*` message (AC 23)
Proof: `VU tests/vitest/unit/components/secondaryConnectionTab.spec.ts -t "tab on a deleted saved connection shows not found"`

**C27** - A restored tab with `targetConnectionId = 7` and no open session for 7: its first `listTableColumns` call sends `conn/create` for 7 under `w1::connection::7` first, then the call under the same `sId`, and resolves with its result (AC 24)
Proof: `VU tests/vitest/unit/store/secondaryConnectionTabs.spec.ts -t "restored tab connects its connection on first use"`

**C28** - `matches()` returns `false` for two `table` tabs (and two `query` tabs) equal except `targetConnectionId` `null` vs `7`, and `true` when both are `7` (AC 25, door 2)
Proof: `VU tests/vitest/unit/transport/TransportOpenTab.spec.ts -t "target connection distinguishes tabs"`

**C29** - Inside a tab bound to `C` (MySQL) in a Postgres window, every one of the 18 tab-rendered files that reads window state resolves `C`'s value instead: `dialect` `mysql`, `dialectData` of mysql, `connectionType` `mysql`, `supportedFeatures` of `C`, `defaultSchema` of `C`, `usedConfig` of `C`, the database list of `C`, and `tablesFor` from `C`'s entities. The test is table-driven over the 18 files and the reads each one makes (AC 26)
Proof: `VU tests/vitest/unit/components/secondaryConnectionContext.spec.ts -t "tab components read the secondary connection"`

**C30** - For a tab bound to `C`, the copy-as-SQL and copy-as-IN-list actions send `conn/getInsertQuery` / `conn/listTableColumns`, and the query tab's transaction keep-alive sends `conn/resetTransactionTimeout`, each with `sId === "w1::connection::7"` (AC 26)
Proof: `VU tests/vitest/unit/components/secondaryConnectionContext.spec.ts -t "direct sends follow the tab connection"`

**C31** - With `C.readOnlyMode = true` and the window's `false`, a tab bound to `C` disables the same controls as a read-only window: `TableTable`'s add-row and import actions, `QueryEditorStatusBar` result editing, `TableSchema`/`TableIndexes`/`TableRelations` edit controls; with `C.readOnlyMode = false` and the window's `true`, they are enabled (AC 27)
Proof: `VU tests/vitest/unit/components/secondaryConnectionContext.spec.ts -t "read only follows the tab connection"`

**C32** - A query tab bound to `C` shows `QueryDatabaseSelector` options `["audit", "shop"]`; choosing `audit` sets the tab's `databaseName` to `audit` and leaves `targetConnectionId` 7 and the window's `database` `a` unchanged (AC 28)
Proof: `VU tests/vitest/unit/components/QueryDatabaseSelector.spec.ts -t "lists and changes databases of the tab connection"`

**C33** - The header of a tab bound to `C` renders text `C`'s name next to the database name and an element with class `connection-label-color-blue`; a tab with `targetConnectionId = null` renders as before (AC 29)
Proof: `VU tests/vitest/unit/components/CoreTabHeader.spec.ts -t "secondary connection name and color in the tab header"`

**C34** - A tab with `targetConnectionId = null` resolves the window client (`connectionFor(null)` returns the window's client object), the window's `dialect`, and its `databaseName` rules as before (AC 30)
Proof: `VU tests/vitest/unit/components/secondaryConnectionContext.spec.ts -t "tabs without a target connection are unchanged"`

**C35** - The context menu of an entity on `C` lists exactly View Data, View Structure, New query and Copy Name; database nodes of `C` list New query only; connection node `C` lists New query, Refresh and Disconnect. Export, import, backup, create, drop, truncate, duplicate, pin, hide and Set color are absent from all three (AC 31)
Proof: `VU tests/vitest/unit/components/VirtualTableListConnections.spec.ts -t "secondary nodes offer only their actions"`

**C36** - Activating a tab bound to `C` on `shop.public.users`, while the window's `a` also has `public.users`, commits a selection key starting with `connection::7::` that differs from every window item key, and the tree reveals `C`'s `users` item (AC 36)
Proof: `VU tests/vitest/unit/components/revealActiveEntity.spec.ts -t "secondary connection tabs select their own connection item"`

### S4 - status bar follows the active tab's connection · 1 file · 1 KB · ~0.2k

**C37** - With the window `red` and `C` `blue`: active tab bound to `C` → the status bar footer has class `blue` and not `red`; active tab with no target, and no active tab → class `red`; a target connection with `labelColor: "default"` → class `default` (AC 32, 33)
Proof: `VU tests/vitest/unit/components/StatusBarConnectionColor.spec.ts -t "status bar color follows the active tab connection"`

**C38** - Switching the active tab from a `C` tab to a window tab changes the footer class from `blue` to `red` on the next tick, without remounting (AC 34)
Proof: `VU tests/vitest/unit/components/StatusBarConnectionColor.spec.ts -t "status bar color changes with the active tab"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| plan Landing doors (3) | door 1 child session C10 · door 2 `targetConnectionId` C23, C28 · door 3 `connectionTreeScope` C6 | - |
| `connectionTreeScope` values (4) | absent C1 · `off` C9 · `pinned` C1, C3 · `all` C2 | - |
| connection list sources (2) | pins C1 · every saved connection of the workspace C2 | - |
| connections never listed (3) | the window's own C1 · unsaved window config C8 · used-only record C8 | - |
| saved-connection changes (5) | pin C7 · rename C7 · recolor C7 · create C7 · delete C7 | - |
| connection node states (4) | idle C17 · connecting C12 · connected C14 · error C13 | - |
| connection node transitions (4) | idle → connecting C11 · connecting → error C13 · error → connecting (retry) C13 · connected → idle (disconnect) C18 | - |
| secondary dialect shape (2) | multiple databases C14 · `multipleDatabases` disabled C14 | - |
| ephemeral prompt outcomes (2) | cancelled C17 · value given C17 | - |
| Disconnect guard (3) | active transaction C19 · reserved connection C19 · neither C19 | - |
| session teardown places (3) | node Disconnect C18 · window `disconnect` / `rollbackConnection` C20 · utility `close` C21 | - |
| messages that must carry the child `sId` (8) | `conn/create` C11 · `conn/listTables` C15 · `conn/selectTop` C24 · `conn/query` C25 · `query/execute` C25 · `query/cancel` C25 · `conn/resetTransactionTimeout` C30 · copy sends C30 | - |
| tab-rendered files reading window state (18) | C29, table-driven over all 18 (TabQueryEditor, TableTable, TabTableProperties, TabWithTable, ResultTable, QueryEditorStatusBar, QueryEditHistory, QueryDatabaseSelector, StatusBar, RowFilterBuilder, BuilderFilter, TableSchema, TableIndexes, TableRelations, TableTriggers, TablePartitions, fk_click, tableMenu) | - |
| window reads per tab (8) | `dialect` C29 · `dialectData` C29 · `connectionType` C29 · `supportedFeatures` C29 · `defaultSchema` C29 · `usedConfig` C29, C31 · database list C29, C32 · `tablesFor` C29 | - |
| tab entry points on secondary nodes (4) | View Data C24 · View Structure C24 · New query on connection C25 · New query on database C25 | - |
| `targetConnectionId` values (3) | `null` C34 · an open saved connection C24 · a missing saved connection C26 | - |
| tab target lifecycle (2) | opened this session C24 · restored after restart C27 | - |
| secondary node menus (3) | connection C35 · database C35 · entity C35 | - |
| status bar color sources (4) | tab on secondary C37 · tab on window C37 · no active tab C37 · secondary with `default` color C37 | - |

- Claims naming an IPC payload: C10, C11, C13, C15, C18, C20, C24, C25, C27, C30. Each proof asserts the
  sent `sId` (and `database` where named) on the message itself, through the real
  `UtilityConnection` where a store is involved.
- No route is consumed outside the app; the plan's `Surface` is `None`.

## Test policy

The repo's guidelines say where tests live and which runner to use, not which level proves what.
These rows apply to this feature only and are not written into the guidelines.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary (utility IPC session routing) | one at the boundary **and** one at its own layer | the `sId` on the message at the boundary; each child-session rule at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Wiring that decides nothing (provide/inject, menu entry → dispatch, header class binding) | one proof that goes through the wiring | exercised once from the user action or state it starts at |
| Instrumentation | none of its own | covered by its consumer's proof |

Evidence:

- `handlerState` child-session resolution and teardown: 3 rules (create under an existing parent, refuse an orphan, remove with the parent) → decides, reached across IPC. Own layer C10, C21; boundary C11, C13 through the real `UtilityConnection` and `FakeUtilityProcess`.
- `connectionTree` store module: scope × source × exclusion, connect/dedupe/error/retry/disconnect, prompt outcomes → decides. C1-C3, C7-C9, C11-C20.
- `VirtualTableList` connection level: node order, colors, states, menus, filter → decides. C1-C5, C12, C14, C19, C22, C35.
- `ElectronUtilityConnectionClient.forConnection` / `connectionForTab`: picks the session and database per tab → decides, reached across IPC. C24, C25, C27, C34.
- Tab context reads in 18 files: each read is a pass-through of the tab's connection context → wiring, proven once per file and read by the table-driven C29.
- `StatusBar` class binding → wiring, C37, C38.
- Closest analogue: `tests/vitest/unit/handlers/connectionFor.spec.ts` and `tests/vitest/unit/store/disconnectAfterUtilityRestart.spec.ts` (session state and the real `UtilityConnection` over `FakeUtilityProcess`), `tests/vitest/unit/components/tabDatabaseProvide.spec.ts` (tab context through provide).

Cost: 7 new spec files and 4 extended ones.

## Swept

- validation: C26 (a target connection id that no saved connection has), C10 (a child `sId` with no parent session)
- failure modes: C13, C17
- idempotency: C16 (concurrent expands), C11 (exactly one `conn/create`)
- authorization: C13 (the server refuses the saved credentials), C31 (read-only follows the tab's connection)
- concurrency: C16, C19 (no disconnect under an open transaction)
- data lifecycle: C23 (migration, `NULL` keeps today's meaning), C20, C21 (sessions end with their window)
- dependency failure: C13 (the secondary server is down or refuses)
- state transitions: C11, C13, C18, C27
- observability: n/a - no logging requirement in the plan; the utility already logs each request by name

## Handoff

Size from `wc -c` on the files each slice touches, divided by 4:

- S1 = 45 KB ≈ 11k (`VirtualTableList.vue`, `TableList.vue`, `Item.vue`, `StatelessDatabaseItem.vue`, `PinConnectionModule.ts`, `SettingStoreModule.ts`) + a new connection item and store module ≈ 3k
- S2 = 78 KB ≈ 19k (`handlerState.ts`, `utility.ts`, `ElectronUtilityConnectionClient.ts`, `store/index.ts`, `TableListContextMenus.ts`) → 33k
- S3 = 431 KB ≈ 108k (the 18 tab-rendered files, `tabConnection.ts`, `TabDatabase.ts`, `OpenTab.ts`, `TransportOpenTab.ts`, `TabModule.ts`, `CoreTabs.vue`, `CoreTabHeader.vue`, `tableMenu.ts`; `TabQueryEditor.vue` and `TableTable.vue` are 60% of it) + a migration → 141k
- S4 = 1 KB → 141k
- Test templates and fixtures ≈ 12k, for **≈ 153k, over the 150k budget**
- Proposed cut, at the surface boundary: batch 1 = S1 + S2 (the tree and the child sessions, ≈ 45k with their tests); batch 2 = S3 + S4 (tabs, dialect context, status bar, ≈ 110k with their tests), on green only
- Mechanism: pending - asked firstmate (handoff vs one builder)
