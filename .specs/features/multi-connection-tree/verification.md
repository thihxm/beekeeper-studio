# Saved connections as parent nodes of the entity tree verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 5f6f2fa92..c588f2533c4bc2a95b70e2d2a11a949314df7a38
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 is scoped by the fix diff `35e868d9a..c588f2533` and by every round-1 verdict that was
not PASS. All proofs re-ran in full at `c588f2533`: 51 check selectors across 15 files, one
invocation, 66 tests passed, and each selector matched at least one passing test. The whole
unit suite is green (166 files, 3682 passed). The fix closed most round-1 gaps:

- the round-1 surviving mutant (`TabTableProperties` provides `null`) is now killed
- the `busyOnConnection` watcher and `keepAliveTransaction` run in a test, and both faults on
  them are killed
- the node's error and Retry are rendered and clicked in a test
- C39-C45 add asserted cases for AC 12, AC 15 and AC 20 rules 3-6
- C8 can now fail

The verdict is still FAIL because:

- **one mutant survived.** It touches the new badge term `TableList.vue:259`. Skipping each
  secondary connection's default database (`loadedOf(connection.databaseEntities,
  connection.database)`) keeps C44 green. The C44 fixture (`TableListFilterBadge.spec.ts:70-75`)
  omits the `database` field that `ConnectionTreeModule.ts:242` always writes, so the test cannot
  tell this mutant from the real code. With the real store shape the mutant would read `2 / 5`.
  C44 is therefore PARTIAL.
- **two members of AC 20 have no proof on secondary connections:**
  - rule 3: a `loading` database. C41 covers idle, locked, error and a connection that is not
    connected.
  - rule 5: a node clicked open while the filter is active. C43 covers only the pre-filter state.
    The window-side feature (`tree-filter-all-databases` C3, C5) treats both as distinct members.
- **the "Decides, not across a boundary" Test policy row is still unmet**, for the same members.

## Binding sources

`verified at c588f2533`

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| None marked binding (profile `standard`, not `ui`). Step 1 does not run. The fix did not touch the interface | - | - | - |

Step 5 (walk the flow with the user) does not apply to a sub-agent round over the checks.

## Checks

`verified at c588f2533` - proofs re-run in full. Citations were refreshed for the 5 spec files the
fix touched:

- `VirtualTableListConnections.spec.ts`
- `connectionTree.spec.ts`
- `tabTargetConnection.spec.ts`
- `TableListFilterBadge.spec.ts`
- `secondaryConnectionProvide.spec.ts` (new)

The other 10 spec files are unchanged in `35e868d9a..c588f2533` (`git diff --stat`), so their
round-1 line numbers still hold at HEAD.

Proof command for every row (one invocation, from `apps/studio/`):

```
yarn -s vitest:unit \
  tests/vitest/unit/components/VirtualTableListConnections.spec.ts \
  tests/vitest/unit/store/connectionTree.spec.ts \
  tests/vitest/unit/components/connectionTreeScopeMenu.spec.ts \
  tests/vitest/unit/handlers/childSession.spec.ts \
  tests/vitest/unit/common/appdb/tabTargetConnection.spec.ts \
  tests/vitest/unit/store/secondaryConnectionTabs.spec.ts \
  tests/vitest/unit/components/secondaryConnectionTab.spec.ts \
  tests/vitest/unit/transport/TransportOpenTab.spec.ts \
  tests/vitest/unit/components/secondaryConnectionContext.spec.ts \
  tests/vitest/unit/components/QueryDatabaseSelector.spec.ts \
  tests/vitest/unit/components/CoreTabHeader.spec.ts \
  tests/vitest/unit/components/revealActiveEntity.spec.ts \
  tests/vitest/unit/components/StatusBarConnectionColor.spec.ts \
  tests/vitest/unit/components/secondaryConnectionProvide.spec.ts \
  tests/vitest/unit/components/TableListFilterBadge.spec.ts \
  --reporter=verbose
```

Result: `Test Files 15 passed (15)`, `Tests 66 passed (66)`.

Every `-t` selector in `checks.md` was matched mechanically against the `✓` lines of that run,
restricted to its own spec file. Each selector hit 1 passing test, except C20 and C29's second
proof:

- C20 `window disconnect closes every secondary connection` hit 2: the `disconnect` and
  `rollbackConnection` variants.
- C29 `children run on the tab connection` hit 3: TableTable, TabTableProperties and
  TabQueryEditor.

Spec paths below are under `apps/studio/tests/vitest/unit/`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | pinned scope, pin order, window first | ✓ "pinned scope lists pinned connections in pin order" | `components/VirtualTableListConnections.spec.ts:155` - `expect(connectionIds(vm)).toEqual(["window", 9, 7])`. Precision (carried from 35e868d9a): the exclusion of the window's own connection is proven by C2 (round-1 F4 killed there) | PASS |
| C2 | all scope by name, full source | ✓ "all scope lists every saved connection by name" · ✓ "loads every saved connection of the workspace" | `components/VirtualTableListConnections.spec.ts:163-164` - `toHaveBeenCalledWith("appdb/saved/find", { options: { where: { workspaceId: -1 } } })`; `toEqual(["app", "Alpha", "beta", "gamma"])` · `store/connectionTree.spec.ts:117-118` - `expect(ids).toEqual([3, 7, 9, 11, 13])` | PASS |
| C3 | empty level, keys as before | ✓ "no listed connection renders no connection level" | `components/VirtualTableListConnections.spec.ts:171-173` - `connectionNodes(vm)).toEqual([])`; keys `toEqual(["database::a", "database::b"])`; `parent.type).toBe("root")` | PASS |
| C4 | window node first, expanded, today's tree under it | ✓ "window connection is first and expanded" | `components/VirtualTableListConnections.spec.ts:181-183` - `first.isWindow).toBe(true)`; `first.expanded).toBe(true)`; `item(vm, "database::a").parent).toBe(first)` | PASS |
| C5 | name and `labelColor`; the `default` color draws nothing | ✓ "connection nodes show name and saved color" | `components/VirtualTableListConnections.spec.ts:194-195` - `.connection-label-color-blue").exists()).toBe(true)`; `[class*='connection-label-color-']").exists()).toBe(false)` | PASS |
| C6 | 3 menu items save `off`/`pinned`/`all` and rebuild | ✓ "scope menu saves each value and rebuilds the tree" | `components/connectionTreeScopeMenu.spec.ts:95-96` - `save).toHaveBeenLastCalledWith({ key: "connectionTreeScope", value })`; `level()).toEqual(expected[value])` | PASS |
| C7 | pin, rename, recolor, create, delete followed; zero `conn/*` | ✓ "connection level follows saved connection changes" | `components/VirtualTableListConnections.spec.ts:206` - `["window", 7, 9]`; `:216-218` - `toEqual(["app", "beta-renamed", "delta"])`, `nodes[1].color).toBe("purple")`, `filter(... "conn/")).toEqual([])` | PASS |
| C8 | only saved connections: unsaved window config, and a pin to an id that was never saved | ✓ "never lists unsaved connections" | `components/VirtualTableListConnections.spec.ts:226` - `toEqual(["window", 9, 7])`; `:230` - pins `[50, 7]` → `connectionIds(pinned.vm)).toEqual(["window", 7])`. This can now fail: any listing of pin 50 changes the array (`ConnectionTreeModule.ts:100-103` drops pins without a saved connection). Precision: the fixture holds no `UsedConnection` record. Pin 50 is simply an id absent from the saved list, which is the only listing source (C2) | PASS |
| C9 | `off` hides the level with pins | ✓ "off scope hides the connection level" | `components/VirtualTableListConnections.spec.ts:237` - `expect(connectionNodes(vm)).toEqual([])` | PASS |
| C10 | child key, shared port, orphan refused | ✓ "creates a child session that shares the window port" | `handlers/childSession.spec.ts:44` - `toBe("w1::connection::7")`; `:49` - `child.port).toBe(state(W1).port)`; `:56-57` - `toThrow(/x9/)`, `toBeUndefined()`. Assembly `src-commercial/entrypoints/utility.ts:201-207` (carried from 35e868d9a, file untouched) | PASS |
| C11 | one `conn/create` under the child sId; zero messages under `w1` | ✓ "expanding a connection creates it in its own session" | `store/connectionTree.spec.ts:129` - `creates).toEqual([{ name: "conn/create", sId: C_KEY, database: undefined }])`; `:131-132` - `config.id).toBe(7)`, `sId).toBe(C_KEY)`; `:135` - every non-`appdb/` `r.sId).toBe(C_KEY)` | PASS |
| C12 | loading indicator while pending | ✓ "connecting node shows loading" | `components/VirtualTableListConnections.spec.ts:256` - `.connection-status").text()).toBe("Connecting...")`; `:260` - `.exists()).toBe(false)` | PASS |
| C13 | driver error and Retry on the node, retry reconnects, child holds a null server | ✓ "a failed connect shows the error and can retry" · ✓ "a failed create leaves the child session without a server" · ✓ "failed connection shows its error and retries" | `store/connectionTree.spec.ts:148-149` - `error).toMatch(/Access denied for user/)`, `state(C_KEY).server).toBeNull()`; `:154` one `conn/create` on retry · `handlers/childSession.spec.ts:103` - `server).toBeNull()` · `components/VirtualTableListConnections.spec.ts:339` - `.connection-status.error` `text()).toContain("Access denied for user")`; `:341-344` - click on `.retry` then `send.mock.calls.some(([name]) => name === "conn/create")).toBe(true)` (rendered markup `StatelessConnectionItem.vue:39-48`) | PASS |
| C14 | databases under C, default expanded; SQLite `E` hangs entities off the node | ✓ "connected secondary connection renders its databases" | `components/VirtualTableListConnections.spec.ts:273` - `toEqual([["audit", false], ["shop", true]])`; `:275` - `["shop:users", "shop:orders"]`; `:282` - `notes.parent).toBe(item(vm, "connection::11"))`. Claim text now names the SQLite `E` the test uses | PASS |
| C15 | `conn/listTables` under child with `database: audit` | ✓ "expanding a secondary database lists it in the child session" | `store/connectionTree.spec.ts:166` - `lists).toEqual([{ name: "conn/listTables", sId: C_KEY, database: "audit" }])` | PASS |
| C16 | concurrent expands connect once | ✓ "concurrent expands connect once" | `store/connectionTree.spec.ts:179` - `filter(... "conn/create")).toHaveLength(1)` | PASS |
| C17 | JWT prompt; cancel leaves idle; token reaches config | ✓ "ephemeral prompt cancel leaves the connection closed" | `store/connectionTree.spec.ts:187-189` - `prompt).toHaveBeenCalledTimes(1)`, `conn/create` `toHaveLength(0)`, `status).toBe("idle")`; `:194` - `config.password).toBe("jwt-token")` | PASS |
| C18 | Disconnect sends both under child, clears node | ✓ "disconnect closes the child session" | `store/connectionTree.spec.ts:204` - `[["conn/disconnect", C_KEY], ["conn/clearConnection", C_KEY]]`; `:208-209` - `status).toBe("idle")`, `databaseEntities).toEqual({})` | PASS |
| C19 | Disconnect disabled under a tab transaction or reserved connection, from the query tab's own state | ✓ "disconnect is disabled while a tab transaction is open" · ✓ "query tab transactions keep its connection from disconnecting" | `components/VirtualTableListConnections.spec.ts:291-302` - `disconnect().class` `""` → `"disabled"` → `"disabled"` → `""` · `components/secondaryConnectionProvide.spec.ts:77-81` - the real `TabQueryEditor` computed `busyOnConnection` (`TabQueryEditor.vue:724-726`) fed to its real watcher handler (`:1182-1186`): transaction → `busyTabs).toEqual({ 21: 7 })`, manual commit → `{ 21: 7 }`, neither → `{}` (F2 killed) | PASS |
| C20 | window `disconnect` / `rollbackConnection` close children first | ✓ "window disconnect closes every secondary connection (disconnect)" · ✓ "(rollbackConnection)" | `store/connectionTree.spec.ts:224` - `slice(0, 2).sort()).toEqual([C_KEY, "w1::connection::9"])`; `:226` - `disconnects[2]).toBe(W1)`; `:227` - `connections).toEqual({})` | PASS |
| C21 | utility `close` removes its children only | ✓ "closing a window removes its child sessions" | `handlers/childSession.spec.ts:71-76` - `w1` children `toBeUndefined()`, child `end` called, `w2::connection::7` defined, `ends[2]).not.toHaveBeenCalled()` | PASS |
| C22 | filter on secondary entities | ✓ "filter applies to secondary connections" | `components/VirtualTableListConnections.spec.ts:317` - `shown).toEqual(["shop:users"])`; `:318` - `not.toContain(item(vm, "connection::7::database::audit"))` | PASS |
| C23 | migration listed, nullable column, round trip | ✓ "migration adds a nullable target connection to tabs" | `common/appdb/tabTargetConnection.spec.ts:17` - `migration).toBeDefined()`; `:31-32` - `targetConnectionId).toBe(7)`, `.toBeNull()` | PASS |
| C24 | View Data / View Structure persist target and run under child | ✓ "entity tabs persist and run on the secondary connection" | `store/secondaryConnectionTabs.spec.ts:127-130` - `[["table", 7, "shop"], ["table-properties", 7, "audit"]]`; `:135` - `{ name: "conn/selectTop", sId: C_KEY, database: undefined }`; `:140` - `{ name: "conn/listTableColumns", sId: C_KEY, database: "audit" }` | PASS |
| C25 | New query on node and database; query, execute, cancel under child | ✓ "new query runs and cancels on the secondary connection" | `store/secondaryConnectionTabs.spec.ts:148-151` - `[["query", 7, "shop"], ["query", 7, "audit"]]`; `:160-165` - `[["conn/query", C_KEY], ["query/execute", C_KEY], ["conn/query", C_KEY], ["query/cancel", C_KEY]]` | PASS |
| C26 | missing saved connection shows not found, sends nothing | ✓ "tab on a deleted saved connection shows not found" | `components/secondaryConnectionTab.spec.ts:37-39` - `toContain("Saved connection not found")`; `dispatch).not.toHaveBeenCalled()`; `conn/` sends `toEqual([])` | PASS |
| C27 | restored tab connects on first use | ✓ "restored tab connects its connection on first use" | `store/secondaryConnectionTabs.spec.ts:179-182` - `indexOf("conn/create")).toBeLessThan(... lastIndexOf("conn/listTableColumns"))`; every `r.sId).toBe(C_KEY)` | PASS |
| C28 | transport `matches()` separates target ids | ✓ "target connection distinguishes tabs" | `transport/TransportOpenTab.spec.ts:21-23` - `matches(tab(type, null), tab(type, 7), "a")).toBe(false)` … `matches(tab(type, 7), tab(type, 7), "a")).toBe(true)` | PASS |
| C29 | tab-rendered files resolve C's reads (16 table-driven + fk_click; tableMenu in C30); query, table and structure tabs hand the connection on through their real `provide` | ✓ "tab components read the secondary connection" · ✓ "TableTable / TabTableProperties / TabQueryEditor children run on the tab connection" | `components/secondaryConnectionContext.spec.ts:114-122`, table `:125-142` (16 components), `:175-176` fk_click (file untouched) · `components/secondaryConnectionProvide.spec.ts:51-55` - a real-`TabDatabaseMixin` child under each tab's real `provide`: `dialect).toBe("mysql")`, `usedConfig.readOnlyMode).toBe(true)`, `database).toBe("audit")`, `connection.session.sId).toBe("w1::connection::7")`; `:59-61` window tab keeps `"postgresql"`, `"a"`, `windowClient` (F1 - the round-1 survivor - killed) | PASS |
| C30 | copy sends and the query tab's keep-alive under child sId | ✓ "direct sends follow the tab connection" · ✓ "query tab keep alive goes to its connection" | `components/secondaryConnectionContext.spec.ts:188-192` (copy sends, file untouched) · `components/secondaryConnectionProvide.spec.ts:96` - the real `TabQueryEditor.methods.keepAliveTransaction` → `send).toHaveBeenCalledWith("conn/resetTransactionTimeout", { tabId: 21, sId: "w1::connection::7" })` (F3 killed) | PASS |
| C31 | read-only follows the tab connection both ways | ✓ "read only follows the tab connection" | `components/secondaryConnectionContext.spec.ts:197` - `usedConfig.readOnlyMode).toBe(true)`; `:206` - `.toBe(false)` for 5 components | PASS |
| C32 | selector lists C's databases, changes only `databaseName` | ✓ "lists and changes databases of the tab connection" | `components/QueryDatabaseSelector.spec.ts:100` - `toEqual(["audit", "shop"])`; `:105-107` - `databaseName).toBe("audit")`, `targetConnectionId).toBe(7)`, `state.database).toBe("a")` | PASS |
| C33 | header shows C name and color; window tab unchanged | ✓ "secondary connection name and color in the tab header" | `components/CoreTabHeader.spec.ts:76` - `.tab-connection").text()).toBe("shop-mysql")`; `:78` - `toContain("connection-label-color-blue")`; `:82-83` - `.tab-connection").exists()).toBe(false)` | PASS |
| C34 | null target resolves the window client and dialect | ✓ "tabs without a target connection are unchanged" | `components/secondaryConnectionContext.spec.ts:217-222` - `connectionFor(null, null)).toBe(windowClient)`; `connectionContext(null).dialect).toBe("postgresql")` | PASS |
| C35 | secondary menus offer only their actions | ✓ "secondary nodes offer only their actions" | `components/VirtualTableListConnections.spec.ts:327-330` - `["New query", "Refresh", "Disconnect"]`, `["New query"]`, `["View Data", "View Structure", "New query", "Copy Name"]` | PASS |
| C36 | selection key `connection::7::`, distinct from window keys, revealed | ✓ "secondary connection tabs select their own connection item" | `components/revealActiveEntity.spec.ts:170` - `key.startsWith("connection::7::")).toBe(true)`; `:210` - `windowKeys).not.toContain(key)`; `:219` - `scrollToIndex).toHaveBeenCalledWith(...)` | PASS |
| C37 | status bar color sources | ✓ "status bar color follows the active tab connection" | `components/StatusBarConnectionColor.spec.ts:57-58` - `footerClasses(wrapper)).toContain(expected)` / `.not.toContain(absent)` over blue/red/red/default | PASS |
| C38 | color changes on tab switch without remount | ✓ "status bar color changes with the active tab" | `components/StatusBarConnectionColor.spec.ts:73-74` - `toContain("red")`, `.not.toContain("blue")` | PASS |
| C39 | locked `secret` stays collapsed; `shop` groups `app` / `sales` schemas | ✓ "secondary connection shows locked databases and schema groups" | `components/VirtualTableListConnections.spec.ts:360-363` - `secret.locked).toBe(true)`, `expanded).toBe(false)`, still `false` after `handleExpand`; `:367` - `schemas).toEqual(["app", "sales"])`; `:369-370` - `users.parent.type).toBe("schema")`, `.entity).toBe("app")` (F5 killed) | PASS |
| C40 | Snowflake MFA prompt; cancel leaves idle; passcode reaches config | ✓ "snowflake MFA prompt cancel leaves the connection closed" | `store/connectionTree.spec.ts:236-238` - `prompt).toHaveBeenCalledTimes(1)`, `conn/create` `toHaveLength(0)`, `status).toBe("idle")`; `:243` - `config.snowflakeOptions.passcode).toBe("123456")` | PASS |
| C41 | filter keeps D, idle `audit`, locked `secret`, error `staging` collapsed and childless | ✓ "filter keeps unloaded secondary nodes collapsed" | `components/VirtualTableListConnections.spec.ts:385-387` - per node `displayItems).toContain(node)`, `expanded).toBe(false)`, children `toEqual([])` over the 4 keys at `:383` | PASS |
| C42 | `audit` loading during the filter shows `user_audit`, stays collapsed | ✓ "filter shows a secondary database that loads during the filter" | `components/VirtualTableListConnections.spec.ts:397` - `.toBe(false)` before; `:402-403` - `.toBe(true)` after the commit, `audit` `expanded).toBe(false)` | PASS |
| C43 | clearing the filter collapses C again | ✓ "clearing the filter restores secondary expansion" | `components/VirtualTableListConnections.spec.ts:412` - `users` shown while filtering; `:417-418` - `connection::7").expanded).toBe(false)`, tables `.toBe(false)` | PASS |
| C44 | badge `3 / 7` with C's loaded `shop` (C's default per Names) and loading `audit` | ✓ "badge counts secondary connections" | `components/TableListFilterBadge.spec.ts:78` - `badge(mountTableList([], secondary))).toBe("3 / 7")`. The fixture at `:70-75` gives connection 7 neither `database` nor `databaseList`, so `shop` is not C's default database there, unlike the shape `ConnectionTreeModule.ts:242` writes. F4 (skip the secondary's default database, `TableList.vue:259`) survived | PARTIAL |
| C45 | app-database `OpenTab.matches` compares the target, both directions | ✓ "app database tab matching compares the target connection" | `common/appdb/tabTargetConnection.spec.ts:37-39` - `tab(null).matches(tab(7), 'a')).toBe(false)`, `tab(7).matches(tab(null), 'a')).toBe(false)`, `tab(7).matches(tab(7), 'a')).toBe(true)` (rule at `OpenTab.ts:176`) | PASS |

## Coverage

Rows the fix touched or added are `verified at c588f2533` and were recomputed from the plan and
the code; the remaining rows are `carried from 35e868d9a`, because their authority (files and AC)
is outside the fix diff. A final sweep looked for sets with no row.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Landing doors (3) - verified at c588f2533 | plan Landing | door 1 C10, C21 · door 2 column C23, transport `matches()` C28, app-database `OpenTab.matches` C45 (`OpenTab.ts:176`) · door 3 C6, C9 | - |
| `connectionTreeScope` values (4) - carried from 35e868d9a | door 3 + `ConnectionTreeModule.ts:90-93` | absent C1, C3 · `off` C6, C9 · `pinned` C6 · `all` C2, C6 | - |
| listed-connection sources (2) - carried from 35e868d9a | `ConnectionTreeModule.ts:95-104` | pins C1 · full saved list C2 | - |
| connections never listed (3) - verified at c588f2533 | AC 1, 2, 8 | window's own C2 · unsaved window config C8 `:226` · pin to an id that was never saved C8 `:230` (can now fail) | - |
| saved-connection changes (5) - carried from 35e868d9a | AC 7 | pin, rename, recolor, create, delete C7 | - |
| connection node states (4) - verified at c588f2533 | `ConnectionTreeModule.ts:21` + `StatelessConnectionItem.vue:33-48` | idle C17 · connecting C12 · connected C11, C14 · error rendered with its message C13 `:339` | - |
| node transitions (4) - verified at c588f2533 | AC 9-11, 16 | idle→connecting C11 · connecting→error C13 · error→connecting by clicking the rendered Retry C13 `:341-344` · connected→idle C18 | - |
| secondary item kinds (5) - verified at c588f2533 | AC 12 + `VirtualTableList.vue:330-360` | connection C5, C14 · database C14 · locked database C39 (F5 killed) · schema group C39 · entity C14, C39 | - |
| secondary dialect shape (2) - carried from 35e868d9a | AC 12 | multiple databases C14 · `multipleDatabases` disabled C14 | - |
| ephemeral prompts (2) - verified at c588f2533 | AC 15 | CockroachDB JWT C17 · Snowflake MFA C40 | - |
| ephemeral prompt outcomes (2) - verified at c588f2533 | AC 15 | cancelled C17, C40 · value given C17, C40 | - |
| filter rules on secondary connections, `tree-filter-all-databases` AC 1-6 (6 rules, 11 members) - verified at c588f2533 | AC 20 → `tree-filter-all-databases/plan.md:75-80` (rule 3 names 4 states; rule 5 names restore and clicks while filtering; rule 6 sums every loaded database) | 1 match shown C22 · 2 no-match hidden C22 · 3 idle C41, error C41, locked C41, a connection that is not connected C41 · 4 loads while filtering C42 · 5 pre-filter expansion restored C43 · 6 badge over a secondary's loaded and loading databases C44 | rule 3 `loading` database under a secondary connection (C41 fixture `:374-376` has idle, locked, error) · rule 5 a secondary node clicked open while filtering stays open after clearing (C43 never clicks) · rule 6 a secondary connection's default database counted (C44 fixture omits `database`; F4 survived at `TableList.vue:259`) |
| Disconnect guard (3) - verified at c588f2533 | AC 17 | active transaction C19 `:77` · reserved connection (`isManualCommit`) C19 `:79` (F2 killed) · neither C19 `:81` | - |
| Disconnect guard sources (2) - verified at c588f2533 | `rg "connectionTree/tabBusy"`: committed only by `TabQueryEditor.vue:1185`; read by the tree menu | query tab's real `busyOnConnection` computed + watcher C19 · tree menu `disabled` class C19 | - |
| session teardown places (3) - carried from 35e868d9a | Flow 8 | node Disconnect C18 · window `disconnect` / `rollbackConnection` C20 · utility `close` C21 | - |
| messages that must carry the child sId (8) - verified at c588f2533 | plan Impact + `ElectronUtilityConnectionClient.ts` | `conn/create` C11 · `conn/listTables` C15 · `conn/selectTop` C24 · `conn/query`, `query/execute`, `query/cancel` C25 · `conn/resetTransactionTimeout` from the real `keepAliveTransaction` C30 (F3 killed) · copy sends C30 | - |
| tab-rendered files reading window state (18) - carried from 35e868d9a | round-1 sweep of `mapGetters`/`mapState`/`$store.getters` (no fix change to these files) | 16 components + fk_click C29 · tableMenu C30 | - |
| tabs that provide their connection to children (3) - verified at c588f2533 | `rg "tabConnectionId:"` in `src/components`: `TableTable.vue:359`, `TabTableProperties.vue:178`, `TabQueryEditor.vue:620` | TableTable C29 · TabTableProperties C29 (F1 killed) · TabQueryEditor C29 | - |
| window reads per tab (8) - carried from 35e868d9a | `TabDatabase.ts` `connectionReads` + `tablesFor` | `dialect`, `dialectData`, `connectionType`, `supportedFeatures`, `defaultSchema`, `usedConfig`, database list, `tablesFor` C29 | - |
| tab entry points on secondary nodes (4) - carried from 35e868d9a | AC 21-22 | View Data, View Structure C24 · New query on connection and on database C25 | - |
| `targetConnectionId` values (3) - carried from 35e868d9a | door 2 | `null` C34 · open C24 · missing C26 | - |
| tab target lifecycle (2) - carried from 35e868d9a | AC 24 | opened now C24 · restored C27 | - |
| secondary node menus (3) - carried from 35e868d9a | AC 31 | connection, database, entity C35 | - |
| status bar color sources (4) - carried from 35e868d9a | AC 32-33 | secondary tab, window tab, without an active tab, `default` color C37 · switch C38 | - |

Sweep for sets with no row, verified at c588f2533. These were read and have rows or are
settled:

- the plan's Landing, Relations, Flow and Observable tables
- AC 1-36
- the claims of C39-C45
- the badge branch `TableList.vue:253-261` added by the fix

The fix's one new source branch, the secondary term of `otherLoadedEntities`, is a member of the
rule 6 row above. Every enumeration that round 1 found without a row now has one (AC 12 item
kinds, AC 15 prompts, AC 20 rules), and no further unrowed set was found.

## Test policy rows

`verified at c588f2533` for the two rows that were unmet in round 1 and for the row classifying
`TableList.vue`; the other two are `carried from 35e868d9a`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (utility IPC session routing) - carried from 35e868d9a | `handlerState.ts`, `utility.ts`, `ElectronUtilityConnectionClient.ts` | boundary C11, C13, C24, C25, C27 · own layer C10, C21 | yes |
| Decides, not reached across a boundary | `ConnectionTreeModule.ts`, `VirtualTableList.vue` connection level, `TableList.vue` badge (touched by the fix) | one asserted case per row of each decision table | unmet - AC 12 (C39) and Snowflake MFA (C40) now have asserted cases, and AC 20 rules 3-6 gained C41-C44. Still missing: rule 3's `loading` state on a secondary database, rule 5's click-while-filtering, and the badge row for a secondary connection's default database (the C44 fixture cannot exercise it; F4 survived) |
| Wiring that decides nothing (provide/inject, menu entry → dispatch, header class binding) | `TabTableProperties.vue`, `TableTable.vue`, `TabQueryEditor.vue` provide; `TabQueryEditor.vue` busy watcher and keep-alive; `StatelessConnectionItem.vue`; `TableList.vue` menu; `StatusBar.vue`, `CoreTabHeader.vue` | one proof through the wiring | yes - each tab's real `provide` feeds a real-mixin child (C29, F1 killed); the real `busyOnConnection` computed and watcher handler commit `tabBusy` (C19, F2 killed); the real `keepAliveTransaction` sends through the tab client (C30, F3 killed); the error and Retry markup is rendered and clicked (C13). Menu C6, status bar C37, header C33 carried. Note: the watcher handler is invoked directly rather than through a mounted tab, so Vue's `immediate` registration is read (`TabQueryEditor.vue:1183`), not run |
| Instrumentation - carried from 35e868d9a | none in this diff | none of its own | yes (n/a) |

## Swept rows

`carried from 35e868d9a`. No `Swept` row resolves to an existing constraint. Each points at a
check run above, and `observability: n/a` is approved policy. The fix added C40 (failure mode:
prompt cancelled) and C41 (state: error); both ran green above.

## Faults injected

`verified at c588f2533`. In-place mutation of a committed file, per the brief's isolation rule
(no worktree, no stash). Before every fault `git status --porcelain` printed `baseline:[]`. Each
file was restored with `git checkout -- <file>`, after which it printed `after:[]`. Test files were
never modified. Five faults were injected, each on a distinct assertion surface. Paths are under
`apps/studio/src/`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (round-1 survivor) `TabTableProperties` provides `tabConnectionId: () => null` | `components/TabTableProperties.vue:178` | yes - `secondaryConnectionProvide.spec.ts` "TabTableProperties children run on the tab connection": `expected 'postgresql' to be 'mysql'` |
| F2 `busyOnConnection` computes `busy: this.hasActiveTransaction` (reserved connection dropped) | `components/TabQueryEditor.vue:725` | yes - "query tab transactions keep its connection from disconnecting": `busyTabs` expected to deeply equal `{ '21': 7 }` |
| F3 `keepAliveTransaction` sends `this.$util.send("conn/resetTransactionTimeout", { tabId })` to the window session instead of `this.connection` | `components/TabQueryEditor.vue:2016` | yes - "query tab keep alive goes to its connection" (`toHaveBeenCalledWith(..., { tabId: 21, sId: "w1::connection::7" })` failed) |
| F4 badge secondary term skips each secondary connection's default database (`loadedOf(connection.databaseEntities, connection.database)`) | `components/sidebar/core/TableList.vue:259` | no - survived: `TableListFilterBadge.spec.ts` and `VirtualTableListConnections.spec.ts` 20/20 green. The C44 fixture omits `database`; the real state always carries it (`ConnectionTreeModule.ts:242`) and keeps the default database's entities in `databaseEntities[database]` (`:259-281`), so the real badge would read `2 / 5` |
| F5 secondary database never locked (`const locked = false`) | `components/sidebar/core/table_list/VirtualTableList.vue:340` | yes - "secondary connection shows locked databases and schema groups": `expected false to be true` |

## Gate

`yarn -s vitest:unit` (whole unit suite, from `apps/studio/`, at `c588f2533`): exit 0,
`Test Files 166 passed (166)`, `Tests 3682 passed | 1 todo (3683)`.
Proof batch: 15 files, 66 passed, 0 failed.

`python3 /Users/thiago/.claude/skills/tlc-spec-lean/scripts/validate_verification.py multi-connection-tree`
(from the repo root), exit 1:

```
  ERROR multi-connection-tree: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [multi-connection-tree]
```
