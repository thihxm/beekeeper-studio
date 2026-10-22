# Saved connections as parent nodes of the entity tree verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 5f6f2fa92..35e868d9a4dce025c0cf5070480074b0689958e6
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Every proof ran at `HEAD` and passed (52 named tests across 13 files, one invocation), and 4 of
5 injected faults were killed. The verdict is FAIL because:

- one mutant survived: the `tabConnectionId` provide/inject wiring has no proof
  (`TabTableProperties.vue:178`)
- five checks are only partly proven (C8, C13, C19, C29, C30)
- three sets the plan enumerates have members with no proof (AC 12 item kinds, AC 15 prompt
  kinds, AC 20 filter rules)
- two `Test policy` rows are unmet

The Handoff says tests were written alongside the code rather than red first. Fault injection
therefore carried more weight than usual here, and it found the provide gap.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| None marked binding (profile `standard`, not `ui`). Step 1 does not run | - | - | - |

Step 5 (walk the flow with the user) does not apply: this is a sub-agent round over the checks,
and a user walk is out of this brief.

## Checks

Proof command for every row (one invocation, from `apps/studio/`):
`yarn -s vitest:unit tests/vitest/unit/components/VirtualTableListConnections.spec.ts tests/vitest/unit/store/connectionTree.spec.ts tests/vitest/unit/components/connectionTreeScopeMenu.spec.ts tests/vitest/unit/handlers/childSession.spec.ts tests/vitest/unit/common/appdb/tabTargetConnection.spec.ts tests/vitest/unit/store/secondaryConnectionTabs.spec.ts tests/vitest/unit/components/secondaryConnectionTab.spec.ts tests/vitest/unit/transport/TransportOpenTab.spec.ts tests/vitest/unit/components/secondaryConnectionContext.spec.ts tests/vitest/unit/components/QueryDatabaseSelector.spec.ts tests/vitest/unit/components/CoreTabHeader.spec.ts tests/vitest/unit/components/revealActiveEntity.spec.ts tests/vitest/unit/components/StatusBarConnectionColor.spec.ts --reporter=verbose`.
Result: 13 files, 52 passed. Each named test below printed its own `✓` line. Spec paths
below are under `apps/studio/tests/vitest/unit/`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | pinned scope, pin order, window first | ✓ "pinned scope lists pinned connections in pin order" | `components/VirtualTableListConnections.spec.ts:155` - `expect(connectionIds(vm)).toEqual(["window", 9, 7])`. Precision: id 3 is unpinned in this fixture, so "a second 3 absent" cannot fail here. The exclusion is proven by C2 (fault F4 was killed by C2, and C1 stayed green) | PASS |
| C2 | all scope by name, full source | ✓ "all scope lists every saved connection by name" · ✓ "loads every saved connection of the workspace" | `components/VirtualTableListConnections.spec.ts:163-164` - `toHaveBeenCalledWith("appdb/saved/find", { options: { where: { workspaceId: -1 } } })`; `toEqual(["app", "Alpha", "beta", "gamma"])` · `store/connectionTree.spec.ts:115-116` - `expect(ids).toEqual([3, 7, 9, 11])` | PASS |
| C3 | no listed connection, keys as before | ✓ "no listed connection renders no connection level" | `components/VirtualTableListConnections.spec.ts:171-173` - `connectionNodes(vm)).toEqual([])`; keys `toEqual(["database::a", "database::b"])`; `parent.type).toBe("root")` | PASS |
| C4 | window node first, expanded, today's tree under it | ✓ "window connection is first and expanded" | `components/VirtualTableListConnections.spec.ts:181-184` - `first.isWindow).toBe(true)`; `first.expanded).toBe(true)`; `item(vm, "database::a").parent).toBe(first)` | PASS |
| C5 | name and `labelColor`, none for `default` | ✓ "connection nodes show name and saved color" | `components/VirtualTableListConnections.spec.ts:194-195` - `beta.find(".connection-label-color-blue").exists()).toBe(true)`; `alpha.find("[class*='connection-label-color-']").exists()).toBe(false)` | PASS |
| C6 | 3 menu items save `off`/`pinned`/`all` and rebuild | ✓ "scope menu saves each value and rebuilds the tree" | `components/connectionTreeScopeMenu.spec.ts:95-96` - `save).toHaveBeenLastCalledWith({ key: "connectionTreeScope", value })`; `level()).toEqual(expected[value])`; `:98` called 3 times | PASS |
| C7 | pin, rename, recolor, create, delete followed, no `conn/*` | ✓ "connection level follows saved connection changes" | `components/VirtualTableListConnections.spec.ts:206` - `["window", 7, 9]`; `:216-218` - `toEqual(["app", "beta-renamed", "delta"])`, `nodes[1].color).toBe("purple")`, `send.mock.calls.filter(... "conn/")).toEqual([])` | PASS |
| C8 | only saved connections, with an unsaved window and a used-only record | ✓ "never lists unsaved connections" | `components/VirtualTableListConnections.spec.ts:226` - `toEqual(["window", 9, 7])` proves the unsaved-window half. `:227` - `not.toContain("quick (used)")` is vacuous: the fixture holds no used-connection record (`rg -n "used"` in the spec finds only `usedConfig`, lines 31/51/223). The used-only member is unproven | PARTIAL |
| C9 | `off` hides the level with pins | ✓ "off scope hides the connection level" | `components/VirtualTableListConnections.spec.ts:234` - `expect(connectionNodes(vm)).toEqual([])` | PASS |
| C10 | child key, shared port, orphan refused | ✓ "creates a child session that shares the window port" | `handlers/childSession.spec.ts:44` - `toBe("w1::connection::7")`; `:49` - `child.port).toBe(state(W1).port)`; `:56-57` - `toThrow(/x9/)`, `state("x9::connection::7")).toBeUndefined()`. Assembly read directly: `src-commercial/entrypoints/utility.ts:201-207` calls `sessionForRequest` and posts `type: 'error'` | PASS |
| C11 | `conn/create` once under child sId, nothing under `w1` | ✓ "expanding a connection creates it in its own session" | `store/connectionTree.spec.ts:127` - `creates).toEqual([{ name: "conn/create", sId: C_KEY, database: undefined }])`; `:129-130` - `config.id).toBe(7)`, `sId).toBe(C_KEY)`; `:133` - non-`appdb/` `r.sId).toBe(C_KEY)` | PASS |
| C12 | loading indicator while pending | ✓ "connecting node shows loading" | `components/VirtualTableListConnections.spec.ts:253` - `.connection-status").text()).toBe("Connecting...")`; `:257` - `.exists()).toBe(false)` | PASS |
| C13 | driver error and Retry on the node, retry reconnects, child holds no server | ✓ "a failed connect shows the error and can retry" · ✓ "a failed create leaves the child session without a server" | `store/connectionTree.spec.ts:146-147` - `error).toMatch(/Access denied for user/)`, `state(C_KEY).server).toBeNull()`; `:152` one `conn/create` on retry · `handlers/childSession.spec.ts:103` - `state(key).server).toBeNull()`. No proof renders the node's error text or Retry control (`StatelessConnectionItem.vue:37-49`): `rg -n "connection-status.error\|\.retry\|Retry"` over both specs finds nothing | PARTIAL |
| C14 | databases under C, default expanded; no-database dialect hangs off the node | ✓ "connected secondary connection renders its databases" | `components/VirtualTableListConnections.spec.ts:270` - `toEqual([["audit", false], ["shop", true]])`; `:272` - `["shop:users", "shop:orders"]`; `:279` - `notes.parent).toBe(item(vm, "connection::11"))`. Precision: the claim names D, but the test uses sqlite id 11 | PASS |
| C15 | `conn/listTables` under child with `database: audit` | ✓ "expanding a secondary database lists it in the child session" | `store/connectionTree.spec.ts:164` - `lists).toEqual([{ name: "conn/listTables", sId: C_KEY, database: "audit" }])` | PASS |
| C16 | concurrent expands connect once | ✓ "concurrent expands connect once" | `store/connectionTree.spec.ts:177` - `filter(... "conn/create")).toHaveLength(1)` | PASS |
| C17 | JWT prompt; cancel leaves idle; token reaches config | ✓ "ephemeral prompt cancel leaves the connection closed" | `store/connectionTree.spec.ts:185-187` - `prompt).toHaveBeenCalledTimes(1)`, `conn/create` length 0, `status).toBe("idle")`; `:192` - `config.password).toBe("jwt-token")` | PASS |
| C18 | Disconnect sends both under child, clears node | ✓ "disconnect closes the child session" | `store/connectionTree.spec.ts:202-205` - `toEqual([["conn/disconnect", C_KEY], ["conn/clearConnection", C_KEY]])`; `:206-207` - `status).toBe("idle")`, `databaseEntities).toEqual({})` | PASS |
| C19 | Disconnect disabled under a tab transaction or reserved connection | ✓ "disconnect is disabled while a tab transaction is open" | `components/VirtualTableListConnections.spec.ts:288-299` - `disconnect().class` goes `""` → `"disabled"` → `"disabled"` → `""`. The test commits `connectionTree/tabBusy` by hand. The source of busy (the `TabQueryEditor.vue:723-726` `busyOnConnection` watcher at `:1182-1186`) is never run: `rg -n "busyOnConnection"` in `tests/vitest/unit` finds nothing | PARTIAL |
| C20 | window `disconnect` / `rollbackConnection` close children first | ✓ "window disconnect closes every secondary connection (disconnect)" · ✓ "(rollbackConnection)" | `store/connectionTree.spec.ts:222` - `slice(0, 2).sort()).toEqual([C_KEY, "w1::connection::9"])`; `:224` - `disconnects[2]).toBe(W1)`; `:225` - `connections).toEqual({})` | PASS |
| C21 | utility `close` removes its children only | ✓ "closing a window removes its child sessions" | `handlers/childSession.spec.ts:71-76` - both `w1` children `toBeUndefined()`, `ends[0..1]` called, `w2::connection::7` defined, `ends[2]).not.toHaveBeenCalled()`. Assembly: `src-commercial/entrypoints/utility.ts:138-141` calls `removeState(sId)` | PASS |
| C22 | filter on secondary entities | ✓ "filter applies to secondary connections" | `components/VirtualTableListConnections.spec.ts:314` - `shown).toEqual(["shop:users"])`; `:315` - `not.toContain(item(vm, "connection::7::database::audit"))` | PASS |
| C23 | migration listed, nullable column, round trip | ✓ "migration adds a nullable target connection to tabs" | `common/appdb/tabTargetConnection.spec.ts:17` - `migration).toBeDefined()`; `:31-32` - `targetConnectionId).toBe(7)`, `.toBeNull()` | PASS |
| C24 | View Data / View Structure persist target and run under child | ✓ "entity tabs persist and run on the secondary connection" | `store/secondaryConnectionTabs.spec.ts:127-130` - `[["table", 7, "shop"], ["table-properties", 7, "audit"]]`; `:135` - `{ name: "conn/selectTop", sId: C_KEY, database: undefined }`; `:140` - `{ name: "conn/listTableColumns", sId: C_KEY, database: "audit" }` | PASS |
| C25 | New query on node and database; query, execute, cancel under child | ✓ "new query runs and cancels on the secondary connection" | `store/secondaryConnectionTabs.spec.ts:148-151` - `[["query", 7, "shop"], ["query", 7, "audit"]]`; `:160-165` - `[["conn/query", C_KEY], ["query/execute", C_KEY], ["conn/query", C_KEY], ["query/cancel", C_KEY]]` | PASS |
| C26 | missing saved connection shows not found, sends nothing | ✓ "tab on a deleted saved connection shows not found" | `components/secondaryConnectionTab.spec.ts:37-39` - `text()).toContain("Saved connection not found")`; `dispatch).not.toHaveBeenCalled()`; `conn/` sends `toEqual([])` | PASS |
| C27 | restored tab connects on first use | ✓ "restored tab connects its connection on first use" | `store/secondaryConnectionTabs.spec.ts:179-182` - `indexOf("conn/create")).toBeLessThan(... lastIndexOf("conn/listTableColumns"))`; every `r.sId).toBe(C_KEY)`; one `conn/create` | PASS |
| C28 | `matches()` separates target ids | ✓ "target connection distinguishes tabs" | `transport/TransportOpenTab.spec.ts:21-23` - `matches(tab(type, null), tab(type, 7), "a")).toBe(false)` … `matches(tab(type, 7), tab(type, 7), "a")).toBe(true)` | PASS |
| C29 | all 18 tab-rendered files resolve C's reads inside a C tab | ✓ "tab components read the secondary connection" | `components/secondaryConnectionContext.spec.ts:114-122` (`expectedRead`, e.g. `ctx.dialect).toBe("mysql")`), table at `:125-142` (16 components), `:175-176` fk_click `tablesFor).toHaveBeenCalledWith("shop", 7)`. The harness injects `tabConnectionId: () => 7` itself (`:100`), so the real provide is bypassed. Fault F5 (`TabTableProperties.vue:178` provides `null`) survived, so the claim "inside a tab bound to C" is unproven for every inject-reading child. The table has 16 rows, not 18 (fk_click is separate; tableMenu is in C30) | PARTIAL |
| C30 | copy sends and transaction keep-alive under child sId | ✓ "direct sends follow the tab connection" | `components/secondaryConnectionContext.spec.ts:188-192` - `[["conn/listTableColumns", "w1::connection::7"], ["conn/getInsertQuery", ...], ["conn/resetTransactionTimeout", ...]]`. Level gap: the keep-alive half calls the client method directly. The query tab's `keepAliveTransaction` (`TabQueryEditor.vue:2013-2017`) is never run (`rg -n "keepAliveTransaction"` in tests finds nothing) | PARTIAL |
| C31 | read-only follows the tab connection both ways | ✓ "read only follows the tab connection" | `components/secondaryConnectionContext.spec.ts:197` - `usedConfig.readOnlyMode).toBe(true)`; `:206` - `.toBe(false)` for 5 components. The controls bind that value directly (`TableTable.vue:217,247`, `QueryEditorStatusBar.vue:125`, `TableSchema.vue:192`, `TableIndexes.vue:168`, `TableRelations.vue:147`) | PASS |
| C32 | selector lists C's databases, changes only `databaseName` | ✓ "lists and changes databases of the tab connection" | `components/QueryDatabaseSelector.spec.ts:100` - `toEqual(["audit", "shop"])`; `:105-107` - `databaseName).toBe("audit")`, `targetConnectionId).toBe(7)`, `state.database).toBe("a")` | PASS |
| C33 | header shows C name and color; window tab unchanged | ✓ "secondary connection name and color in the tab header" | `components/CoreTabHeader.spec.ts:76` - `.tab-connection").text()).toBe("shop-mysql")`; `:78` - `toContain("connection-label-color-blue")`; `:82-83` - `.tab-connection").exists()).toBe(false)`, green database stripe | PASS |
| C34 | null target resolves the window client and dialect | ✓ "tabs without a target connection are unchanged" | `components/secondaryConnectionContext.spec.ts:217-222` - `connectionFor(null, null)).toBe(windowClient)`; `connectionFor("b", null).session).toBeNull()`; `connectionContext(null).dialect).toBe("postgresql")` (real root getters) | PASS |
| C35 | secondary menus offer only their actions | ✓ "secondary nodes offer only their actions" | `components/VirtualTableListConnections.spec.ts:324-327` - `["New query", "Refresh", "Disconnect"]`, `["New query"]`, `["View Data", "View Structure", "New query", "Copy Name"]` (exact equality) | PASS |
| C36 | selection key `connection::7::`, distinct from window keys, revealed | ✓ "secondary connection tabs select their own connection item" | `components/revealActiveEntity.spec.ts:170` - `key.startsWith("connection::7::")).toBe(true)`; `:210` - `windowKeys).not.toContain(key)`; `:212` - `target.connectionId).toBe(7)`; `:219` - `scrollToIndex).toHaveBeenCalledWith(vm.displayItems.indexOf(target))` | PASS |
| C37 | status bar color sources | ✓ "status bar color follows the active tab connection" | `components/StatusBarConnectionColor.spec.ts:57-58` - `footerClasses(wrapper)).toContain(expected)` / `.not.toContain(absent)` over the 4 cases blue/red/red/default | PASS |
| C38 | color changes on tab switch without remount | ✓ "status bar color changes with the active tab" | `components/StatusBarConnectionColor.spec.ts:73-74` - `toContain("red")`, `.not.toContain("blue")` after `tabs/active` commit | PASS |

## Coverage

Each set was recomputed from the plan (Landing, Flow, AC text, Observable) and from the code.
The author's table was not reused.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Landing doors (3) | plan Landing | door 1 key, port sharing, orphan refusal C10 (F1 killed), child teardown on close C21 (F2 killed) · door 2 column C23, `matches()` C28 · door 3 values C6, C9 | - |
| `connectionTreeScope` values (4) | door 3 + `ConnectionTreeModule.ts:90-93` | absent C1, C3 · `off` C6, C9 · `pinned` C6 · `all` C2, C6 | - |
| listed-connection sources (2) | `ConnectionTreeModule.ts:95-104`, `:183-194` | pins C1 · full saved list C2 (`appdb/saved/find` asserted) | - |
| connections never listed (3) | AC 1, 2, 8 | window's own C2 (F4 killed by C2; C1's fixture cannot show it) · unsaved window config C8 | used-only record: the C8 assertion at `VirtualTableListConnections.spec.ts:227` is vacuous |
| saved-connection changes (5) | AC 7 | pin, rename, recolor, create, delete C7 | - |
| connection node states (4) | `ConnectionTreeModule.ts:21` | idle C17 · connecting C12 · connected C11, C14 | error state rendered on the node (`StatelessConnectionItem.vue:37-49`): state proven in C13, rendering unproven |
| node transitions (4) | AC 9-11, 16 | idle→connecting C11, C12 · connecting→error C13 · connected→idle C18 | error→connecting via the node's Retry control (`Item.vue:12`, `VirtualTableList.vue:572`): only a re-dispatch of `open` is proven |
| AC 12 item kinds under a secondary connection (4) | AC 12 "database, locked, schema and entity items" (the artifacts give this set no row) | database C14 · entity C14 | locked database (`VirtualTableList.vue` diff, the `node.inaccessibleDatabases` branch) · schema group under a secondary connection |
| secondary dialect shape (2) | AC 12 | multiple databases C14 · `multipleDatabases` disabled C14 | - |
| ephemeral prompt kinds (2) | AC 15 (the artifacts give this set no row) | CockroachDB JWT C17 | Snowflake MFA passcode: `rg -i "snowflake\|mfa"` finds nothing in `connectionTree.spec.ts` or any test of `resolveEphemeralValues` |
| ephemeral prompt outcomes (2) | AC 15 | cancelled C17 · value given C17 | - |
| Disconnect guard inputs (3) | AC 17 + `TabQueryEditor.vue:723-726` | neither C19 · guard over busy tabs C19 | active transaction and reserved connection reaching `tabBusy` from a real query tab (`TabQueryEditor.vue:1182-1186`) |
| session teardown places (3) | Flow 8 | node Disconnect C18 · window `disconnect` / `rollbackConnection` C20 · utility `close` C21 (assembly at `utility.ts:138-141`) | - |
| messages that must carry the child sId (8) | plan Impact + `ElectronUtilityConnectionClient.ts` | `conn/create` C11 · `conn/listTables` C15 · `conn/selectTop` C24 · `conn/query` C25 · `query/execute` C25 (F3 killed) · `query/cancel` C25 · copy sends C30 | `conn/resetTransactionTimeout` from the query tab's keep-alive (`TabQueryEditor.vue:2016`): only the client method is proven |
| tab-rendered files reading window state (18) | diff + sweep (`rg` of `mapGetters` / `mapState` / `$store.getters` over `src/components`, `src/mixins`, `src/lib/menu`) | reads of all 16 components + fk_click C29, tableMenu C30. The sweep found no further tab-rendered file reading window getters (the remaining hits are import/export/backup/builder/shell tabs, QuickSearch and the sidebar, all out of scope). `AddFieldModal` is mounted nowhere | inject path: `tabConnectionId` provided by `TabTableProperties.vue:178`, `TableTable.vue:359`, `TabQueryEditor.vue:620` to the 12 `TabDatabaseMixin` children (F5 survived) |
| window reads per tab (8) | `TabDatabase.ts` `connectionReads` + `tablesFor` | `dialect`, `dialectData`, `connectionType`, `supportedFeatures`, `defaultSchema`, `usedConfig`, database list, `tablesFor` C29 (database list also C32, `usedConfig` also C31) | - |
| tab entry points on secondary nodes (4) | AC 21-22 | View Data C24 · View Structure C24 · New query on connection C25 · on database C25 | - |
| `targetConnectionId` values (3) | door 2 | `null` C34 · open C24 · missing C26 | - |
| tab target lifecycle (2) | AC 24 | opened now C24 · restored C27 | - |
| secondary node menus (3) | AC 31 | connection, database, entity C35 | - |
| status bar color sources (4) | AC 32-33 + `store/index.ts` `activeConnectionColor` | secondary tab, window tab, no tab, `default` color C37 · switch C38 | - |
| filter rules applied to secondary connections (6) | AC 20 → `tree-filter-all-databases` AC 1-6 (the artifacts give this set no row) | rule 1 (match shown in a collapsed loaded database) C22 · rule 2 (loaded database with no match hidden) C22 | rule 3 (idle/loading/error/locked shown collapsed) · rule 4 (loads while filtering) · rule 5 (expansion restored on clear) · rule 6 (badge counts) |

Notes:

- `OpenTab.matches` (`src/common/appdb/models/OpenTab.ts:169`) gained the same rule but has no
  proof. It also has no caller in `src` (`rg -n "\.matches\("` finds none), so this is a note,
  not a gap.
- `FakeUtilityProcess` (`tests/vitest/lib/FakeUtilityProcess.ts:38`) mirrors the utility
  listener. The real assembly was read directly at `utility.ts:201-207`.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (utility IPC session routing) | `handlerState.ts`, `utility.ts`, `ElectronUtilityConnectionClient.ts` | boundary C11, C13, C24, C25, C27 (real `UtilityConnection` over `FakeUtilityProcess`) · own layer C10, C21; `utility.ts:201-207` read directly | yes |
| Decides, not reached across a boundary | `ConnectionTreeModule.ts`, `VirtualTableList.vue` connection level | one asserted case per row of each decision table | unmet - AC 20 filter rules 3-6, AC 12 locked/schema items and the Snowflake MFA prompt have no asserted case |
| Wiring that decides nothing (provide/inject, menu entry → dispatch, header class binding) | `TabTableProperties.vue`, `TableTable.vue`, `TabQueryEditor.vue` provide; `TabQueryEditor.vue` busy watcher and keep-alive; `StatelessConnectionItem.vue`; `TableList.vue` menu; `StatusBar.vue`, `CoreTabHeader.vue` | one proof through the wiring | unmet - the menu (C6), status bar (C37) and header (C33) wiring are proven, but `tabConnectionId` provide/inject has no proof (F5 survived), and neither does `busyOnConnection` → `tabBusy`, `keepAliveTransaction` → client, or the node's error/Retry rendering |
| Instrumentation | none in this diff | none of its own | yes (n/a) |

## Swept rows

No `Swept` row resolves to an existing constraint. Each row points at a check that was run
above: validation C26, C10 · failure modes C13, C17 · idempotency C16, C11 · authorization C13,
C31 · concurrency C16, C19 · data lifecycle C23, C20, C21 · dependency failure C13 · state
transitions C11, C13, C18, C27. `observability: n/a` is approved policy.

## Faults injected

Isolation: in-place mutation of a committed file. Before and after each fault, `git status --porcelain` printed nothing (`baseline:[]` / `after:[]`), and each file was restored with `git checkout -- <file>`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 child `State` no longer shares the window port (`child.port = parent.port` removed) | `src/handlers/handlerState.ts:96` | yes - C10 "creates a child session that shares the window port" (`expected null to be { name: 'w1-port' }`) |
| F2 window close no longer ends child servers (`states.get(key).server?.end()` removed) | `src/handlers/handlerState.ts:107` | yes - C21 "closing a window removes its child sessions" |
| F3 `query/execute` sent to the window session (`sendToSession` → `$util.send`) | `src/lib/utility/ElectronUtilityConnectionClient.ts:130` | yes - C25 "new query runs and cancels on the secondary connection" (`Query not found`) |
| F4 `listed` getter keeps the window's own saved connection (`&& c.id !== own` removed) | `src/store/modules/ConnectionTreeModule.ts:97` | yes - C2 "all scope lists every saved connection by name" (C1 stayed green) |
| F5 `TabTableProperties` provides `tabConnectionId: () => null` to its children | `src/components/TabTableProperties.vue:178` | no - survived C29, C30, C31, C34, `tabDatabaseProvide.spec.ts`, `tabDatabaseColumns.spec.ts`, `secondaryConnectionTab.spec.ts`, `secondaryConnectionTabs.spec.ts` (all specs that reference the file) |

## Gate

`yarn -s vitest:unit` (whole unit suite, from `apps/studio/`): 165 files, 3669 passed, 1 todo,
0 failed, exit 0.
Proof batch: 13 files, 52 passed, 0 failed.
