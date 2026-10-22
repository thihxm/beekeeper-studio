# Saved connections as parent nodes of the entity tree verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 5f6f2fa92..66e4a754b32854060d083bfd4dae17a829d51248
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 3 is scoped by:

- the fix diff `c588f2533..66e4a754b`: two spec files, the C41/C43/C44 texts and two new Coverage
  rows in `checks.md`. No source file changed.
- every verdict from round 2 that was not PASS: C44, the AC 20 rule 3 and rule 5 members, and
  the "Decides, not reached across a boundary" row.

All proofs re-ran in full at `66e4a754b`: 51 check selectors across 15 files in one invocation,
66 tests passed, and each selector matched at least one passing test. The whole unit suite is
green (166 files, 3682 passed).

The three round-2 gaps are closed:

- **badge.** The C44 fixture now carries `database: "shop"`. The round-2 survivor (skipping a
  secondary connection's default database at `TableList.vue:259`) is now killed and reads `2 / 5`.
- **rule 5.** C43 now clicks the connection node during the filter. Dropping that click's
  effect on the stored expansion is killed at `VirtualTableListConnections.spec.ts:429`.
- **rule 3, filtered out.** C41 now holds a `loading` database. Filtering out a loading database
  is killed.

The verdict is still FAIL because of the member the fix added. C41 says a `loading` database (like
`idle` and `error` ones) is displayed "collapsed" while filtering, but it asserts only the stored
`node.expanded` field (`:387`). The tree never draws that field. A database row is drawn open or
closed from `isOpen(source)` (`Item.vue:26`), which is `item.expanded ||
openedByFilter(item)` (`VirtualTableList.vue:421-422`). An open loading row also shows `Loading...`
(`StatelessDatabaseItem.vue:44`).

Two mutants make `openedByFilter` return `true` while filtering:

- F4: for a `loading` database
- F5: for every unlocked database that is not loaded

Under both, those rows render open. AC 20 rule 3 (via `tree-filter-all-databases` AC 3) says
they display "collapsed and without children". Both mutants survived C41, and they also survived
the window-side `VirtualTableListFilter.spec.ts`.

## Binding sources

`carried from c588f2533`. The fix touched only tests and `checks.md`, not the interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| None marked binding (profile `standard`, not `ui`); step 1 does not run | - | - | - |

Step 5 (walk the flow with the user) does not apply to a sub-agent round over the checks.

## Checks

Proofs `verified at 66e4a754b`, all re-run in full.

Citations were refreshed for the 2 spec files the fix touched:

- `TableListFilterBadge.spec.ts`
- `VirtualTableListConnections.spec.ts`. Its hunk starts at line 372, so the lines cited for
  C1-C39 (all below 372) are unchanged.

The other 13 spec files and all of `src/` are unchanged in `c588f2533..66e4a754b` (`git diff
--stat`). Their citations are `carried from c588f2533`.

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

Result: exit 0, `Test Files 15 passed (15)`, `Tests 66 passed (66)`.

A script parsed every `Proof:` line of `checks.md` (51 selectors) and matched it against the `✓`
lines of that run, restricted to the selector's own spec file. Each selector hit exactly 1
passing test, except two:

- C20 hit 2: the `disconnect` and `rollbackConnection` variants.
- C29's second proof hit 3: TableTable, TabTableProperties and TabQueryEditor.

Spec paths below are under `apps/studio/tests/vitest/unit/`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | pinned scope, pin order, window first | ✓ "pinned scope lists pinned connections in pin order" | `components/VirtualTableListConnections.spec.ts:155` - `expect(connectionIds(vm)).toEqual(["window", 9, 7])`. Exclusion of the window's own connection proven by C2 (carried) | PASS |
| C2 | all scope by name, full source | ✓ "all scope lists every saved connection by name" · ✓ "loads every saved connection of the workspace" | `components/VirtualTableListConnections.spec.ts:163-164` - `toHaveBeenCalledWith("appdb/saved/find", { options: { where: { workspaceId: -1 } } })`; `toEqual(["app", "Alpha", "beta", "gamma"])` · `store/connectionTree.spec.ts:117-118` - `expect(ids).toEqual([3, 7, 9, 11, 13])` | PASS |
| C3 | empty level, keys as before | ✓ "no listed connection renders no connection level" | `components/VirtualTableListConnections.spec.ts:171-173` - `connectionNodes(vm)).toEqual([])`; keys `toEqual(["database::a", "database::b"])`; `parent.type).toBe("root")` | PASS |
| C4 | window node first, expanded, today's tree under it | ✓ "window connection is first and expanded" | `components/VirtualTableListConnections.spec.ts:181-183` - `first.isWindow).toBe(true)`; `first.expanded).toBe(true)`; `item(vm, "database::a").parent).toBe(first)` | PASS |
| C5 | name and `labelColor`; `default` draws nothing | ✓ "connection nodes show name and saved color" | `components/VirtualTableListConnections.spec.ts:194-195` - `.connection-label-color-blue").exists()).toBe(true)`; `[class*='connection-label-color-']").exists()).toBe(false)` | PASS |
| C6 | 3 menu items save `off`/`pinned`/`all` and rebuild | ✓ "scope menu saves each value and rebuilds the tree" | `components/connectionTreeScopeMenu.spec.ts:95-96` - `save).toHaveBeenLastCalledWith({ key: "connectionTreeScope", value })`; `level()).toEqual(expected[value])` | PASS |
| C7 | pin, rename, recolor, create, delete followed; zero `conn/*` | ✓ "connection level follows saved connection changes" | `components/VirtualTableListConnections.spec.ts:206` - `["window", 7, 9]`; `:216-218` - `toEqual(["app", "beta-renamed", "delta"])`, `nodes[1].color).toBe("purple")`, `filter(... "conn/")).toEqual([])` | PASS |
| C8 | only saved connections listed | ✓ "never lists unsaved connections" | `components/VirtualTableListConnections.spec.ts:226` - `toEqual(["window", 9, 7])`; `:230` - pins `[50, 7]` → `connectionIds(pinned.vm)).toEqual(["window", 7])` | PASS |
| C9 | `off` hides the level with pins | ✓ "off scope hides the connection level" | `components/VirtualTableListConnections.spec.ts:237` - `expect(connectionNodes(vm)).toEqual([])` | PASS |
| C10 | child key, shared port, orphan refused | ✓ "creates a child session that shares the window port" | `handlers/childSession.spec.ts:44` - `toBe("w1::connection::7")`; `:49` - `child.port).toBe(state(W1).port)`; `:56-57` - `toThrow(/x9/)`, `toBeUndefined()` | PASS |
| C11 | one `conn/create` under the child sId; zero under `w1` | ✓ "expanding a connection creates it in its own session" | `store/connectionTree.spec.ts:129` - `creates).toEqual([{ name: "conn/create", sId: C_KEY, database: undefined }])`; `:131-132` - `config.id).toBe(7)`, `sId).toBe(C_KEY)`; `:135` - every non-`appdb/` `r.sId).toBe(C_KEY)` | PASS |
| C12 | loading indicator while pending | ✓ "connecting node shows loading" | `components/VirtualTableListConnections.spec.ts:256` - `.connection-status").text()).toBe("Connecting...")`; `:260` - `.exists()).toBe(false)` | PASS |
| C13 | driver error and Retry, retry reconnects, child server null | ✓ "a failed connect shows the error and can retry" · ✓ "a failed create leaves the child session without a server" · ✓ "failed connection shows its error and retries" | `store/connectionTree.spec.ts:148-149` - `error).toMatch(/Access denied for user/)`, `state(C_KEY).server).toBeNull()` · `handlers/childSession.spec.ts:103` - `server).toBeNull()` · `components/VirtualTableListConnections.spec.ts:339` - `text()).toContain("Access denied for user")`; `:344` - `name === "conn/create")).toBe(true)` | PASS |
| C14 | databases under C, default expanded; SQLite `E` entities under the node | ✓ "connected secondary connection renders its databases" | `components/VirtualTableListConnections.spec.ts:273` - `toEqual([["audit", false], ["shop", true]])`; `:275` - `["shop:users", "shop:orders"]`; `:282` - `notes.parent).toBe(item(vm, "connection::11"))` | PASS |
| C15 | `conn/listTables` under child with `database: audit` | ✓ "expanding a secondary database lists it in the child session" | `store/connectionTree.spec.ts:166` - `lists).toEqual([{ name: "conn/listTables", sId: C_KEY, database: "audit" }])` | PASS |
| C16 | concurrent expands connect once | ✓ "concurrent expands connect once" | `store/connectionTree.spec.ts:179` - `filter(... "conn/create")).toHaveLength(1)` | PASS |
| C17 | JWT prompt; cancel leaves idle; token reaches config | ✓ "ephemeral prompt cancel leaves the connection closed" | `store/connectionTree.spec.ts:187-189` - `prompt).toHaveBeenCalledTimes(1)`, `conn/create` `toHaveLength(0)`, `status).toBe("idle")`; `:194` - `config.password).toBe("jwt-token")` | PASS |
| C18 | Disconnect sends both under child, clears node | ✓ "disconnect closes the child session" | `store/connectionTree.spec.ts:204` - `[["conn/disconnect", C_KEY], ["conn/clearConnection", C_KEY]]`; `:208-209` - `status).toBe("idle")`, `databaseEntities).toEqual({})` | PASS |
| C19 | Disconnect disabled under a transaction or reserved connection | ✓ "disconnect is disabled while a tab transaction is open" · ✓ "query tab transactions keep its connection from disconnecting" | `components/VirtualTableListConnections.spec.ts:291-302` - `disconnect().class` `""` → `"disabled"` → `"disabled"` → `""` · `components/secondaryConnectionProvide.spec.ts:77-81` - `busyTabs).toEqual({ 21: 7 })` twice, then `{}` | PASS |
| C20 | window `disconnect` / `rollbackConnection` close children first | ✓ "window disconnect closes every secondary connection (disconnect)" · ✓ "(rollbackConnection)" | `store/connectionTree.spec.ts:224` - `slice(0, 2).sort()).toEqual([C_KEY, "w1::connection::9"])`; `:226` - `disconnects[2]).toBe(W1)`; `:227` - `connections).toEqual({})` | PASS |
| C21 | utility `close` removes its children only | ✓ "closing a window removes its child sessions" | `handlers/childSession.spec.ts:71-76` - `w1` children `toBeUndefined()`, `w2::connection::7` defined, `ends[2]).not.toHaveBeenCalled()` | PASS |
| C22 | filter on secondary entities | ✓ "filter applies to secondary connections" | `components/VirtualTableListConnections.spec.ts:317` - `shown).toEqual(["shop:users"])`; `:318` - `not.toContain(item(vm, "connection::7::database::audit"))` | PASS |
| C23 | migration listed, nullable column, round trip | ✓ "migration adds a nullable target connection to tabs" | `common/appdb/tabTargetConnection.spec.ts:17` - `migration).toBeDefined()`; `:31-32` - `targetConnectionId).toBe(7)`, `.toBeNull()` | PASS |
| C24 | View Data / View Structure persist target and run under child | ✓ "entity tabs persist and run on the secondary connection" | `store/secondaryConnectionTabs.spec.ts:127-130` - `[["table", 7, "shop"], ["table-properties", 7, "audit"]]`; `:135` - `{ name: "conn/selectTop", sId: C_KEY, database: undefined }`; `:140` - `{ name: "conn/listTableColumns", sId: C_KEY, database: "audit" }` | PASS |
| C25 | New query on node and database; query, execute, cancel under child | ✓ "new query runs and cancels on the secondary connection" | `store/secondaryConnectionTabs.spec.ts:148-151` - `[["query", 7, "shop"], ["query", 7, "audit"]]`; `:160-165` - `[["conn/query", C_KEY], ["query/execute", C_KEY], ["conn/query", C_KEY], ["query/cancel", C_KEY]]` | PASS |
| C26 | missing saved connection shows not found, sends nothing | ✓ "tab on a deleted saved connection shows not found" | `components/secondaryConnectionTab.spec.ts:37-39` - `toContain("Saved connection not found")`; `dispatch).not.toHaveBeenCalled()`; `conn/` sends `toEqual([])` | PASS |
| C27 | restored tab connects on first use | ✓ "restored tab connects its connection on first use" | `store/secondaryConnectionTabs.spec.ts:179-182` - `indexOf("conn/create")).toBeLessThan(... lastIndexOf("conn/listTableColumns"))`; every `r.sId).toBe(C_KEY)` | PASS |
| C28 | transport `matches()` separates target ids | ✓ "target connection distinguishes tabs" | `transport/TransportOpenTab.spec.ts:21-23` - `matches(tab(type, null), tab(type, 7), "a")).toBe(false)` … `matches(tab(type, 7), tab(type, 7), "a")).toBe(true)` | PASS |
| C29 | tab-rendered files resolve C's reads; tabs provide the connection to children | ✓ "tab components read the secondary connection" · ✓ "TableTable / TabTableProperties / TabQueryEditor children run on the tab connection" | `components/secondaryConnectionContext.spec.ts:114-122`, table `:125-142`, `:175-176` fk_click · `components/secondaryConnectionProvide.spec.ts:51-55` - `dialect).toBe("mysql")`, `usedConfig.readOnlyMode).toBe(true)`, `database).toBe("audit")`, `connection.session.sId).toBe("w1::connection::7")`; `:59-61` window tab keeps `"postgresql"` | PASS |
| C30 | copy sends and keep-alive under child sId | ✓ "direct sends follow the tab connection" · ✓ "query tab keep alive goes to its connection" | `components/secondaryConnectionContext.spec.ts:188-192` · `components/secondaryConnectionProvide.spec.ts:96` - `send).toHaveBeenCalledWith("conn/resetTransactionTimeout", { tabId: 21, sId: "w1::connection::7" })` | PASS |
| C31 | read-only follows the tab connection both ways | ✓ "read only follows the tab connection" | `components/secondaryConnectionContext.spec.ts:197` - `usedConfig.readOnlyMode).toBe(true)`; `:206` - `.toBe(false)` for 5 components | PASS |
| C32 | selector lists C's databases, changes only `databaseName` | ✓ "lists and changes databases of the tab connection" | `components/QueryDatabaseSelector.spec.ts:100` - `toEqual(["audit", "shop"])`; `:105-107` - `databaseName).toBe("audit")`, `targetConnectionId).toBe(7)`, `state.database).toBe("a")` | PASS |
| C33 | header shows C name and color; window tab unchanged | ✓ "secondary connection name and color in the tab header" | `components/CoreTabHeader.spec.ts:76` - `.tab-connection").text()).toBe("shop-mysql")`; `:78` - `toContain("connection-label-color-blue")`; `:82-83` - `.tab-connection").exists()).toBe(false)` | PASS |
| C34 | null target resolves the window client and dialect | ✓ "tabs without a target connection are unchanged" | `components/secondaryConnectionContext.spec.ts:217-222` - `connectionFor(null, null)).toBe(windowClient)`; `connectionContext(null).dialect).toBe("postgresql")` | PASS |
| C35 | secondary menus offer only their actions | ✓ "secondary nodes offer only their actions" | `components/VirtualTableListConnections.spec.ts:327-330` - `["New query", "Refresh", "Disconnect"]`, `["New query"]`, `["View Data", "View Structure", "New query", "Copy Name"]` | PASS |
| C36 | selection key `connection::7::`, distinct, revealed | ✓ "secondary connection tabs select their own connection item" | `components/revealActiveEntity.spec.ts:170` - `key.startsWith("connection::7::")).toBe(true)`; `:210` - `windowKeys).not.toContain(key)`; `:219` - `scrollToIndex).toHaveBeenCalledWith(...)` | PASS |
| C37 | status bar color sources | ✓ "status bar color follows the active tab connection" | `components/StatusBarConnectionColor.spec.ts:57-58` - `footerClasses(wrapper)).toContain(expected)` / `.not.toContain(absent)` over blue/red/red/default | PASS |
| C38 | color changes on tab switch without remount | ✓ "status bar color changes with the active tab" | `components/StatusBarConnectionColor.spec.ts:73-74` - `toContain("red")`, `.not.toContain("blue")` | PASS |
| C39 | locked `secret` stays collapsed; `shop` groups schemas | ✓ "secondary connection shows locked databases and schema groups" | `components/VirtualTableListConnections.spec.ts:360-363` - `secret.locked).toBe(true)`, `expanded).toBe(false)` before and after `handleExpand`; `:367` - `schemas).toEqual(["app", "sales"])`; `:369-370` - `users.parent.type).toBe("schema")`, `.entity).toBe("app")` | PASS |
| C40 | Snowflake MFA prompt; cancel leaves idle; passcode reaches config | ✓ "snowflake MFA prompt cancel leaves the connection closed" | `store/connectionTree.spec.ts:236-238` - `prompt).toHaveBeenCalledTimes(1)`, `conn/create` `toHaveLength(0)`, `status).toBe("idle")`; `:243` - `config.snowflakeOptions.passcode).toBe("123456")` | PASS |
| C41 | filter keeps D, idle `audit`, loading `reports`, locked `secret`, error `staging` displayed, collapsed, childless (refreshed) | ✓ "filter keeps unloaded secondary nodes collapsed" | `components/VirtualTableListConnections.spec.ts:377` - `reports` committed `status: "loading"`; `:384` - the 5 keys; `:386-388` - `displayItems).toContain(node)`, `node.expanded).toBe(false)`, children `toEqual([])`. "Collapsed" is asserted on the stored field only. The row is drawn from `isOpen(source)` (`Item.vue:26`), which a test never reads, so F4 (loading opened by the filter) and F5 (idle/loading/error opened by the filter) survived. Under both, the rows render open, with `Loading...` from `StatelessDatabaseItem.vue:44`. Displayed and childless are proven (F2 killed) | PARTIAL |
| C42 | `audit` loading during the filter shows `user_audit`, stays collapsed (refreshed) | ✓ "filter shows a secondary database that loads during the filter" | `components/VirtualTableListConnections.spec.ts:398` - `.toBe(false)` before; `:403-404` - `.toBe(true)` after the commit, `audit` `expanded).toBe(false)`. Here "collapsed" means the user's stored expansion: by rule 4, the node is drawn open by the filter | PASS |
| C43 | clearing the filter restores pre-filter state and keeps a click made during the filter (refreshed) | ✓ "clearing the filter restores secondary expansion" | `components/VirtualTableListConnections.spec.ts:418-419` - `connection::7").expanded).toBe(false)`, tables `.toBe(false)`; `:424` - `vm.handleExpand(null, item(vm, "connection::7"))` while filtering; `:429-430` - `expanded).toBe(true)`, `users` displayed after clearing (F3 killed at `:429`) | PASS |
| C44 | badge `3 / 7` with C's loaded default `shop` and loading `audit` (refreshed) | ✓ "badge counts secondary connections" | `components/TableListFilterBadge.spec.ts:72` - fixture `database: "shop"`; `:79` - `badge(mountTableList([], secondary))).toBe("3 / 7")` (F1, the round-2 survivor, killed: `expected '2 / 5' to be '3 / 7'`) | PASS |
| C45 | app-database `OpenTab.matches` compares the target, both directions | ✓ "app database tab matching compares the target connection" | `common/appdb/tabTargetConnection.spec.ts:37-39` - `tab(null).matches(tab(7), 'a')).toBe(false)`, `tab(7).matches(tab(null), 'a')).toBe(false)`, `tab(7).matches(tab(7), 'a')).toBe(true)` | PASS |

Precision gap (C41, and the same wording in `tree-filter-all-databases` C3): the checks use
"collapsed" in two senses.

- C42 rightly means the user's stored expansion. Rule 4 has the filter draw that node open.
- C41 must mean the drawn state (`isOpen`). Rule 3 says the node is *displayed* collapsed.

C41's assertion settles only the first sense.

## Coverage

The three rows the fix touched were recomputed from the plan (AC 20 → `tree-filter-all-databases`
AC 1-6) and the code (`VirtualTableList.vue:421-435`, `:558-570`; `TableList.vue:253-261`); they
are `verified at 66e4a754b`. Every other row is `carried from c588f2533`, because neither its
authority nor its proofs changed. The sweep for unrowed sets is carried. The fix added test
cases and no source branch, so it created no new member.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Landing doors (3) - carried from c588f2533 | plan Landing | door 1 C10, C21 · door 2 C23, C28, C45 · door 3 C6, C9 | - |
| `connectionTreeScope` values (4) - carried from c588f2533 | door 3 + `ConnectionTreeModule.ts:90-93` | absent C1, C3 · `off` C6, C9 · `pinned` C6 · `all` C2, C6 | - |
| listed-connection sources (2) - carried from c588f2533 | `ConnectionTreeModule.ts:95-104` | pins C1 · full saved list C2 | - |
| connections never listed (3) - carried from c588f2533 | AC 1, 2, 8 | window's own C2 · unsaved window config C8 · pin to an id never saved C8 | - |
| saved-connection changes (5) - carried from c588f2533 | AC 7 | pin, rename, recolor, create, delete C7 | - |
| connection node states (4) - carried from c588f2533 | `ConnectionTreeModule.ts:21` + `StatelessConnectionItem.vue:33-48` | idle C17 · connecting C12 · connected C11, C14 · error C13 | - |
| node transitions (4) - carried from c588f2533 | AC 9-11, 16 | idle→connecting C11 · connecting→error C13 · error→connecting via Retry C13 · connected→idle C18 | - |
| secondary item kinds (5) - carried from c588f2533 | AC 12 + `VirtualTableList.vue:330-360` | connection C5, C14 · database C14 · locked database C39 · schema group C39 · entity C14, C39 | - |
| secondary dialect shape (2) - carried from c588f2533 | AC 12 | multiple databases C14 · `multipleDatabases` disabled C14 | - |
| ephemeral prompts (2) - carried from c588f2533 | AC 15 | CockroachDB JWT C17 · Snowflake MFA C40 | - |
| ephemeral prompt outcomes (2) - carried from c588f2533 | AC 15 | cancelled C17, C40 · value given C17, C40 | - |
| filter rules on secondary connections, `tree-filter-all-databases` AC 1-6 (6) - verified at 66e4a754b | AC 20 → `tree-filter-all-databases/plan.md:75-80` | 1 match shown C22 · 2 loaded no-match hidden C22 · 3 unloaded displayed and childless C41 (F2 killed) · 4 loads while filtering C42 · 5 expansion restored, before and during the filter C43 (F3 killed) · 6 badge incl. a secondary's default database C44 (F1 killed) | rule 3 "collapsed" as drawn: C41 asserts `node.expanded`, never `isOpen`; F4/F5 survived (`VirtualTableListConnections.spec.ts:387`) |
| secondary database states while filtering (5) - verified at 66e4a754b | `tree-filter-all-databases` AC 3 + `VirtualTableList.vue:425-435` | idle C41 · loading C41 (`:377`) · error C41 · locked C41 (`openedByFilter` returns `!locked`, `:428`) · loaded C22 | idle, loading, error drawn collapsed: F5 opened all three and F4 opened loading, and both survived |
| expansion sources restored on clear, secondary (2) - verified at 66e4a754b | `tree-filter-all-databases` AC 5 + `handleExpand` `VirtualTableList.vue:558-570` | before the filter C43 `:418` · clicked during the filter C43 `:424`, `:429` (F3 killed) | - |
| Disconnect guard (3) - carried from c588f2533 | AC 17 | active transaction C19 · reserved connection C19 · neither C19 | - |
| Disconnect guard sources (2) - carried from c588f2533 | `TabQueryEditor.vue:1185`, tree menu | query tab `busyOnConnection` + watcher C19 · tree menu `disabled` class C19 | - |
| session teardown places (3) - carried from c588f2533 | Flow 8 | node Disconnect C18 · window `disconnect` / `rollbackConnection` C20 · utility `close` C21 | - |
| messages that must carry the child sId (8) - carried from c588f2533 | plan Impact + `ElectronUtilityConnectionClient.ts` | `conn/create` C11 · `conn/listTables` C15 · `conn/selectTop` C24 · `conn/query`, `query/execute`, `query/cancel` C25 · `conn/resetTransactionTimeout` C30 · copy sends C30 | - |
| tab-rendered files reading window state (18) - carried from c588f2533 | round-1 sweep | 16 components + fk_click C29 · tableMenu C30 | - |
| tabs that provide their connection to children (3) - carried from c588f2533 | `TableTable.vue:359`, `TabTableProperties.vue:178`, `TabQueryEditor.vue:620` | TableTable, TabTableProperties, TabQueryEditor C29 | - |
| window reads per tab (8) - carried from c588f2533 | `TabDatabase.ts` | all 8 C29; `usedConfig` C31; database list C32 | - |
| tab entry points on secondary nodes (4) - carried from c588f2533 | AC 21-22 | View Data, View Structure C24 · New query on connection and database C25 | - |
| `targetConnectionId` values (3) - carried from c588f2533 | door 2 | `null` C34 · open C24 · missing C26 | - |
| tab target lifecycle (2) - carried from c588f2533 | AC 24 | opened now C24 · restored C27 | - |
| secondary node menus (3) - carried from c588f2533 | AC 31 | connection, database, entity C35 | - |
| status bar color sources (4) - carried from c588f2533 | AC 32-33 | secondary tab, window tab, without an active tab, `default` color C37 · switch C38 | - |

## Test policy rows

The two rows that classify files the fix's proofs touch are `verified at 66e4a754b`:

- "Decides, not reached across a boundary": unmet in round 2.
- "Wiring": classifies `TableList.vue`.

The other two rows are `carried from c588f2533`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (utility IPC session routing) - carried from c588f2533 | `handlerState.ts`, `utility.ts`, `ElectronUtilityConnectionClient.ts` | boundary C11, C13, C24, C25, C27 · own layer C10, C21 | yes |
| Decides, not reached across a boundary - verified at 66e4a754b | `ConnectionTreeModule.ts`, `VirtualTableList.vue` connection level and filter rules, `TableList.vue` badge | one asserted case per row of each decision table | unmet - the badge row for a secondary's default database (F1 killed) and the click-during-filter row (F3 killed) now have asserted cases. Each rule 3 state has a case, but the "drawn collapsed" outcome of `openedByFilter` for idle/loading/error databases is asserted on `node.expanded` only. F4 and F5 survived at `VirtualTableList.vue:425-429` |
| Wiring that decides nothing - verified at 66e4a754b | tab `provide`s, `TabQueryEditor.vue` busy watcher and keep-alive, `StatelessConnectionItem.vue`, `TableList.vue` menu, `StatusBar.vue`, `CoreTabHeader.vue` | one proof through the wiring | yes - the fix's diff contains these files' proofs unchanged; C6, C13, C19, C29, C30, C33, C37 ran green at HEAD |
| Instrumentation - carried from c588f2533 | none in this diff | none of its own | yes (n/a) |

## Swept rows

`carried from c588f2533`. None of the `Swept` rows resolves to an existing constraint. Each
points at a check that ran above, and `observability: n/a` is approved policy. The fix added
state members to C41 (loading) and C43 (click during the filter), and both ran green.

## Faults injected

`verified at 66e4a754b`. Each fault was an in-place mutation of a committed source file, per the
brief's isolation rule (no worktree, no stash). Before each fault, `git status --porcelain`
printed `baseline:[]`. After each fault, `git checkout -- <file>` restored the file and the
command printed `after:[]`. Test files were never modified. Five faults were injected, on the
surfaces the fix touched. Paths are under `apps/studio/src/`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (round-2 survivor) badge secondary term skips each connection's default database: `loadedOf(connection.databaseEntities, connection.database)` | `components/sidebar/core/TableList.vue:259` | yes - "badge counts secondary connections": `expected '2 / 5' to be '3 / 7'` |
| F2 `filteredOut` drops a `loading` database with no match: `(item.status === "loaded" \|\| item.status === "loading") && !item.hasMatch` | `components/sidebar/core/table_list/VirtualTableList.vue:434` | yes - "filter keeps unloaded secondary nodes collapsed": `expected [ Array(11) ] to include { type: 'database', … }` |
| F3 `handleExpand` leaves a connection node's stored expansion alone while filtering: `if (!(this.filtering && item.type === "connection")) item.expanded = !item.expanded` | `components/sidebar/core/table_list/VirtualTableList.vue:560` | yes - "clearing the filter restores secondary expansion": `expected false to be true` at `VirtualTableListConnections.spec.ts:429` |
| F4 `openedByFilter` opens a `loading` database while filtering: `if (this.filtering && item.type === "database" && item.status === "loading") return true` before the `hasMatch` guard | `components/sidebar/core/table_list/VirtualTableList.vue:426` | survived - `VirtualTableListConnections.spec.ts` and `VirtualTableListFilter.spec.ts` 35/35 green. The row renders open with `Loading...` (`Item.vue:26` → `StatelessDatabaseItem.vue:44`); C41 reads only `node.expanded` |
| F5 `openedByFilter` opens every unlocked database that is not loaded (idle, loading, error) while filtering | `components/sidebar/core/table_list/VirtualTableList.vue:426` | survived - the same two files, 35/35 green |

## Gate

The whole unit suite (`yarn -s vitest:unit`, from `apps/studio/`, at `66e4a754b`) exited 0:
`Test Files 166 passed (166)`, `Tests 3682 passed | 1 todo (3683)`. The proof batch had 15
files: 66 passed, 0 failed.

`python3 /Users/thiago/.claude/skills/tlc-spec-lean/scripts/validate_verification.py multi-connection-tree`
was run from the repo root and exited 1:

```
  ERROR multi-connection-tree: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [multi-connection-tree]
```
