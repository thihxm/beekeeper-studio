# Saved connections as parent nodes of the entity tree verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 5f6f2fa92..25a4ae75c78120a2e8fca5d7188ef497bf73b79e
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 4 was authorized by the supervisor for two checks only:

- C41 of this feature
- C3 of `tree-filter-all-databases`

It is scoped by:

- the fix diff `92237c2ed..25a4ae75c`. It changed two spec files (two added lines each) and the
  C41 / C3 text and Handoff in the two `checks.md` files. No file under `src/` or
  `src-commercial/` changed (`git diff 92237c2ed..HEAD --stat -- src src-commercial` is empty).
- every verdict from round 3 that was not PASS:
  - C41 (PARTIAL)
  - the Coverage rows "filter rules on secondary connections" (rule 3) and "secondary database
    states while filtering"
  - the Test policy row "Decides, not reached across a boundary"

All proofs re-ran in full at `25a4ae75c`, in one invocation. That covers 52 check selectors: 51
from this feature plus `tree-filter-all-databases` C3. Each selector matched at least one passing
test, and the whole unit suite is green (166 files, 3682 passed).

The round-3 gap is closed. C41 and the window-side C3 now assert the drawn state, not only the
stored flag:

- `expect(vm.isOpen(node)).toBe(false)` at `VirtualTableListConnections.spec.ts:389`
- `expect(vm.isOpen(d)).toBe(false)` at `VirtualTableListFilter.spec.ts:170`

`isOpen` is what each row is drawn from: `Item.vue:6`, `:26` and `:48` bind
`:expanded="isOpen(source)"`. `isOpen` is `item.expanded || this.openedByFilter(item)`
(`VirtualTableList.vue:421-422`). The two round-3 mutants were re-injected:

- F4 (the filter opens a loading database) is now killed.
- F5 (the filter opens every unlocked database that is not loaded) is now killed.

A third mutant, F6 (the filter opens an error database), is also killed. Each one fails at both
new lines.

## Binding sources

`carried from 66e4a754b`. The fix touched only tests and `checks.md`, not the interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| None marked binding (profile `standard`, not `ui`); step 1 does not run | - | - | - |

Step 5 (walk the flow with the user) does not apply to a sub-agent round over the checks.

## Checks

The proofs are `verified at 25a4ae75c`, all re-run in full.

C41 has fresh evidence. C42 and C43 keep their round-3 verdicts, with citations refreshed: the
fix inserted two lines at `VirtualTableListConnections.spec.ts:388-389`, so every line after 389
moved by 2. The citations for C1-C40, C44 and C45 are `carried from 66e4a754b`: those lines are
all below 372 in `VirtualTableListConnections.spec.ts` or in files the fix did not touch.

Proof command for every row (one invocation, from `apps/studio/`). The 19 files are every spec path
named in `multi-connection-tree/checks.md`, plus `VirtualTableListFilter.spec.ts`. The 3 analogue
specs named in the Test policy evidence (`connectionFor`, `disconnectAfterUtilityRestart`,
`tabDatabaseProvide`) ride along at no cost.

```
yarn -s vitest:unit \
  tests/vitest/unit/common/appdb/tabTargetConnection.spec.ts \
  tests/vitest/unit/components/connectionTreeScopeMenu.spec.ts \
  tests/vitest/unit/components/CoreTabHeader.spec.ts \
  tests/vitest/unit/components/QueryDatabaseSelector.spec.ts \
  tests/vitest/unit/components/revealActiveEntity.spec.ts \
  tests/vitest/unit/components/secondaryConnectionContext.spec.ts \
  tests/vitest/unit/components/secondaryConnectionProvide.spec.ts \
  tests/vitest/unit/components/secondaryConnectionTab.spec.ts \
  tests/vitest/unit/components/StatusBarConnectionColor.spec.ts \
  tests/vitest/unit/components/tabDatabaseProvide.spec.ts \
  tests/vitest/unit/components/TableListFilterBadge.spec.ts \
  tests/vitest/unit/components/VirtualTableListConnections.spec.ts \
  tests/vitest/unit/components/VirtualTableListFilter.spec.ts \
  tests/vitest/unit/handlers/childSession.spec.ts \
  tests/vitest/unit/handlers/connectionFor.spec.ts \
  tests/vitest/unit/store/connectionTree.spec.ts \
  tests/vitest/unit/store/disconnectAfterUtilityRestart.spec.ts \
  tests/vitest/unit/store/secondaryConnectionTabs.spec.ts \
  tests/vitest/unit/transport/TransportOpenTab.spec.ts \
  --reporter=verbose
```

Result: exit 0, `Test Files 19 passed (19)`, `Tests 98 passed | 1 todo (99)`.

A script parsed every `Proof:` line of `multi-connection-tree/checks.md` (51 selectors) and the
`tree-filter-all-databases` C3 line. It matched each selector as a regex against the `✓` lines of
that run, restricted to the selector's own spec file. Zero matched lines were failures or skips.
Each selector hit exactly 1 passing test, except:

- C20: 2 (the `disconnect` and `rollbackConnection` variants)
- C29's second proof: 3 (TableTable, TabTableProperties, TabQueryEditor)
- `tree-filter-all-databases` C3: 4 (`idle`, `loading`, `error`, `locked`)

The C41 hit:

```
✓ tests/vitest/unit/components/VirtualTableListConnections.spec.ts > connection level of the entity tree > filter keeps unloaded secondary nodes collapsed 20ms
```

Spec paths below are under `apps/studio/tests/vitest/unit/`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | pinned scope, pin order, window first | ✓ "pinned scope lists pinned connections in pin order" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:155` - `expect(connectionIds(vm)).toEqual(["window", 9, 7])`. Exclusion of the window's own connection proven by C2 (carried) | PASS |
| C2 | all scope by name, full source | ✓ "all scope lists every saved connection by name" · ✓ "loads every saved connection of the workspace" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:163-164` - `toHaveBeenCalledWith("appdb/saved/find", { options: { where: { workspaceId: -1 } } })`; `toEqual(["app", "Alpha", "beta", "gamma"])` · `store/connectionTree.spec.ts:117-118` - `expect(ids).toEqual([3, 7, 9, 11, 13])` | PASS |
| C3 | empty level, keys as before | ✓ "no listed connection renders no connection level" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:171-173` - `connectionNodes(vm)).toEqual([])`; keys `toEqual(["database::a", "database::b"])`; `parent.type).toBe("root")` | PASS |
| C4 | window node first, expanded, today's tree under it | ✓ "window connection is first and expanded" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:181-183` - `first.isWindow).toBe(true)`; `first.expanded).toBe(true)`; `item(vm, "database::a").parent).toBe(first)` | PASS |
| C5 | name and `labelColor`; `default` draws nothing | ✓ "connection nodes show name and saved color" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:194-195` - `.connection-label-color-blue").exists()).toBe(true)`; `[class*='connection-label-color-']").exists()).toBe(false)` | PASS |
| C6 | 3 menu items save `off`/`pinned`/`all` and rebuild | ✓ "scope menu saves each value and rebuilds the tree" (ran at 25a4ae75c) | carried from 66e4a754b - `components/connectionTreeScopeMenu.spec.ts:95-96` - `save).toHaveBeenLastCalledWith({ key: "connectionTreeScope", value })`; `level()).toEqual(expected[value])` | PASS |
| C7 | pin, rename, recolor, create, delete followed; zero `conn/*` | ✓ "connection level follows saved connection changes" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:206` - `["window", 7, 9]`; `:216-218` - `toEqual(["app", "beta-renamed", "delta"])`, `nodes[1].color).toBe("purple")`, `filter(... "conn/")).toEqual([])` | PASS |
| C8 | only saved connections listed | ✓ "never lists unsaved connections" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:226` - `toEqual(["window", 9, 7])`; `:230` - pins `[50, 7]` → `connectionIds(pinned.vm)).toEqual(["window", 7])` | PASS |
| C9 | `off` hides the level with pins | ✓ "off scope hides the connection level" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:237` - `expect(connectionNodes(vm)).toEqual([])` | PASS |
| C10 | child key, shared port, orphan refused | ✓ "creates a child session that shares the window port" (ran at 25a4ae75c) | carried from 66e4a754b - `handlers/childSession.spec.ts:44` - `toBe("w1::connection::7")`; `:49` - `child.port).toBe(state(W1).port)`; `:56-57` - `toThrow(/x9/)`, `toBeUndefined()` | PASS |
| C11 | one `conn/create` under the child sId; zero under `w1` | ✓ "expanding a connection creates it in its own session" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:129` - `creates).toEqual([{ name: "conn/create", sId: C_KEY, database: undefined }])`; `:131-132` - `config.id).toBe(7)`, `sId).toBe(C_KEY)`; `:135` - every non-`appdb/` `r.sId).toBe(C_KEY)` | PASS |
| C12 | loading indicator while pending | ✓ "connecting node shows loading" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:256` - `.connection-status").text()).toBe("Connecting...")`; `:260` - `.exists()).toBe(false)` | PASS |
| C13 | driver error and Retry, retry reconnects, child server null | ✓ "a failed connect shows the error and can retry" · ✓ "a failed create leaves the child session without a server" · ✓ "failed connection shows its error and retries" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:148-149` - `error).toMatch(/Access denied for user/)`, `state(C_KEY).server).toBeNull()` · `handlers/childSession.spec.ts:103` - `server).toBeNull()` · `components/VirtualTableListConnections.spec.ts:339` - `text()).toContain("Access denied for user")`; `:344` - `name === "conn/create")).toBe(true)` | PASS |
| C14 | databases under C, default expanded; SQLite `E` entities under the node | ✓ "connected secondary connection renders its databases" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:273` - `toEqual([["audit", false], ["shop", true]])`; `:275` - `["shop:users", "shop:orders"]`; `:282` - `notes.parent).toBe(item(vm, "connection::11"))` | PASS |
| C15 | `conn/listTables` under child with `database: audit` | ✓ "expanding a secondary database lists it in the child session" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:166` - `lists).toEqual([{ name: "conn/listTables", sId: C_KEY, database: "audit" }])` | PASS |
| C16 | concurrent expands connect once | ✓ "concurrent expands connect once" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:179` - `filter(... "conn/create")).toHaveLength(1)` | PASS |
| C17 | JWT prompt; cancel leaves idle; token reaches config | ✓ "ephemeral prompt cancel leaves the connection closed" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:187-189` - `prompt).toHaveBeenCalledTimes(1)`, `conn/create` `toHaveLength(0)`, `status).toBe("idle")`; `:194` - `config.password).toBe("jwt-token")` | PASS |
| C18 | Disconnect sends both under child, clears node | ✓ "disconnect closes the child session" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:204` - `[["conn/disconnect", C_KEY], ["conn/clearConnection", C_KEY]]`; `:208-209` - `status).toBe("idle")`, `databaseEntities).toEqual({})` | PASS |
| C19 | Disconnect disabled under a transaction or reserved connection | ✓ "disconnect is disabled while a tab transaction is open" · ✓ "query tab transactions keep its connection from disconnecting" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:291-302` - `disconnect().class` `""` → `"disabled"` → `"disabled"` → `""` · `components/secondaryConnectionProvide.spec.ts:77-81` - `busyTabs).toEqual({ 21: 7 })` twice, then `{}` | PASS |
| C20 | window `disconnect` / `rollbackConnection` close children first | ✓ "window disconnect closes every secondary connection (disconnect)" · ✓ "(rollbackConnection)" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:224` - `slice(0, 2).sort()).toEqual([C_KEY, "w1::connection::9"])`; `:226` - `disconnects[2]).toBe(W1)`; `:227` - `connections).toEqual({})` | PASS |
| C21 | utility `close` removes its children only | ✓ "closing a window removes its child sessions" (ran at 25a4ae75c) | carried from 66e4a754b - `handlers/childSession.spec.ts:71-76` - `w1` children `toBeUndefined()`, `w2::connection::7` defined, `ends[2]).not.toHaveBeenCalled()` | PASS |
| C22 | filter on secondary entities | ✓ "filter applies to secondary connections" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:317` - `shown).toEqual(["shop:users"])`; `:318` - `not.toContain(item(vm, "connection::7::database::audit"))` | PASS |
| C23 | migration listed, nullable column, round trip | ✓ "migration adds a nullable target connection to tabs" (ran at 25a4ae75c) | carried from 66e4a754b - `common/appdb/tabTargetConnection.spec.ts:17` - `migration).toBeDefined()`; `:31-32` - `targetConnectionId).toBe(7)`, `.toBeNull()` | PASS |
| C24 | View Data / View Structure persist target and run under child | ✓ "entity tabs persist and run on the secondary connection" (ran at 25a4ae75c) | carried from 66e4a754b - `store/secondaryConnectionTabs.spec.ts:127-130` - `[["table", 7, "shop"], ["table-properties", 7, "audit"]]`; `:135` - `{ name: "conn/selectTop", sId: C_KEY, database: undefined }`; `:140` - `{ name: "conn/listTableColumns", sId: C_KEY, database: "audit" }` | PASS |
| C25 | New query on node and database; query, execute, cancel under child | ✓ "new query runs and cancels on the secondary connection" (ran at 25a4ae75c) | carried from 66e4a754b - `store/secondaryConnectionTabs.spec.ts:148-151` - `[["query", 7, "shop"], ["query", 7, "audit"]]`; `:160-165` - `[["conn/query", C_KEY], ["query/execute", C_KEY], ["conn/query", C_KEY], ["query/cancel", C_KEY]]` | PASS |
| C26 | missing saved connection shows not found, sends nothing | ✓ "tab on a deleted saved connection shows not found" (ran at 25a4ae75c) | carried from 66e4a754b - `components/secondaryConnectionTab.spec.ts:37-39` - `toContain("Saved connection not found")`; `dispatch).not.toHaveBeenCalled()`; `conn/` sends `toEqual([])` | PASS |
| C27 | restored tab connects on first use | ✓ "restored tab connects its connection on first use" (ran at 25a4ae75c) | carried from 66e4a754b - `store/secondaryConnectionTabs.spec.ts:179-182` - `indexOf("conn/create")).toBeLessThan(... lastIndexOf("conn/listTableColumns"))`; every `r.sId).toBe(C_KEY)` | PASS |
| C28 | transport `matches()` separates target ids | ✓ "target connection distinguishes tabs" (ran at 25a4ae75c) | carried from 66e4a754b - `transport/TransportOpenTab.spec.ts:21-23` - `matches(tab(type, null), tab(type, 7), "a")).toBe(false)` … `matches(tab(type, 7), tab(type, 7), "a")).toBe(true)` | PASS |
| C29 | tab-rendered files resolve C's reads; tabs provide the connection to children | ✓ "tab components read the secondary connection" · ✓ "TableTable / TabTableProperties / TabQueryEditor children run on the tab connection" (ran at 25a4ae75c) | carried from 66e4a754b - `components/secondaryConnectionContext.spec.ts:114-122`, table `:125-142`, `:175-176` fk_click · `components/secondaryConnectionProvide.spec.ts:51-55` - `dialect).toBe("mysql")`, `usedConfig.readOnlyMode).toBe(true)`, `database).toBe("audit")`, `connection.session.sId).toBe("w1::connection::7")`; `:59-61` window tab keeps `"postgresql"` | PASS |
| C30 | copy sends and keep-alive under child sId | ✓ "direct sends follow the tab connection" · ✓ "query tab keep alive goes to its connection" (ran at 25a4ae75c) | carried from 66e4a754b - `components/secondaryConnectionContext.spec.ts:188-192` · `components/secondaryConnectionProvide.spec.ts:96` - `send).toHaveBeenCalledWith("conn/resetTransactionTimeout", { tabId: 21, sId: "w1::connection::7" })` | PASS |
| C31 | read-only follows the tab connection both ways | ✓ "read only follows the tab connection" (ran at 25a4ae75c) | carried from 66e4a754b - `components/secondaryConnectionContext.spec.ts:197` - `usedConfig.readOnlyMode).toBe(true)`; `:206` - `.toBe(false)` for 5 components | PASS |
| C32 | selector lists C's databases, changes only `databaseName` | ✓ "lists and changes databases of the tab connection" (ran at 25a4ae75c) | carried from 66e4a754b - `components/QueryDatabaseSelector.spec.ts:100` - `toEqual(["audit", "shop"])`; `:105-107` - `databaseName).toBe("audit")`, `targetConnectionId).toBe(7)`, `state.database).toBe("a")` | PASS |
| C33 | header shows C name and color; window tab unchanged | ✓ "secondary connection name and color in the tab header" (ran at 25a4ae75c) | carried from 66e4a754b - `components/CoreTabHeader.spec.ts:76` - `.tab-connection").text()).toBe("shop-mysql")`; `:78` - `toContain("connection-label-color-blue")`; `:82-83` - `.tab-connection").exists()).toBe(false)` | PASS |
| C34 | null target resolves the window client and dialect | ✓ "tabs without a target connection are unchanged" (ran at 25a4ae75c) | carried from 66e4a754b - `components/secondaryConnectionContext.spec.ts:217-222` - `connectionFor(null, null)).toBe(windowClient)`; `connectionContext(null).dialect).toBe("postgresql")` | PASS |
| C35 | secondary menus offer only their actions | ✓ "secondary nodes offer only their actions" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:327-330` - `["New query", "Refresh", "Disconnect"]`, `["New query"]`, `["View Data", "View Structure", "New query", "Copy Name"]` | PASS |
| C36 | selection key `connection::7::`, distinct, revealed | ✓ "secondary connection tabs select their own connection item" (ran at 25a4ae75c) | carried from 66e4a754b - `components/revealActiveEntity.spec.ts:170` - `key.startsWith("connection::7::")).toBe(true)`; `:210` - `windowKeys).not.toContain(key)`; `:219` - `scrollToIndex).toHaveBeenCalledWith(...)` | PASS |
| C37 | status bar color sources | ✓ "status bar color follows the active tab connection" (ran at 25a4ae75c) | carried from 66e4a754b - `components/StatusBarConnectionColor.spec.ts:57-58` - `footerClasses(wrapper)).toContain(expected)` / `.not.toContain(absent)` over blue/red/red/default | PASS |
| C38 | color changes on tab switch without remount | ✓ "status bar color changes with the active tab" (ran at 25a4ae75c) | carried from 66e4a754b - `components/StatusBarConnectionColor.spec.ts:73-74` - `toContain("red")`, `.not.toContain("blue")` | PASS |
| C39 | locked `secret` stays collapsed; `shop` groups schemas | ✓ "secondary connection shows locked databases and schema groups" (ran at 25a4ae75c) | carried from 66e4a754b - `components/VirtualTableListConnections.spec.ts:360-363` - `secret.locked).toBe(true)`, `expanded).toBe(false)` before and after `handleExpand`; `:367` - `schemas).toEqual(["app", "sales"])`; `:369-370` - `users.parent.type).toBe("schema")`, `.entity).toBe("app")` | PASS |
| C40 | Snowflake MFA prompt; cancel leaves idle; passcode reaches config | ✓ "snowflake MFA prompt cancel leaves the connection closed" (ran at 25a4ae75c) | carried from 66e4a754b - `store/connectionTree.spec.ts:236-238` - `prompt).toHaveBeenCalledTimes(1)`, `conn/create` `toHaveLength(0)`, `status).toBe("idle")`; `:243` - `config.snowflakeOptions.passcode).toBe("123456")` | PASS |
| C41 | with filter `use`, D, idle `audit`, loading `reports`, locked `secret` and error `staging` are displayed, collapsed as stored and as drawn, and childless (verified at 25a4ae75c) | ✓ "filter keeps unloaded secondary nodes collapsed" (ran at 25a4ae75c) | `components/VirtualTableListConnections.spec.ts:375-377` - fixture: `secret` inaccessible, `staging` committed `status: "error"`, `reports` committed `status: "loading"`; `:384` - loop over the 5 keys; `:386` - `expect(vm.displayItems).toContain(node)`; `:387` - `expect(node.expanded).toBe(false)`; `:389` - `expect(vm.isOpen(node)).toBe(false)`; `:390` - `expect(vm.displayItems.filter((i: any) => i.parent === node)).toEqual([])`. The `isOpen` that is asserted is the one the row draws from (`Item.vue:26` `:expanded="isOpen(source)"`), so both senses of "collapsed" are settled. F4, F5 and F6 are each killed at `:389` | PASS |
| C42 | `audit` loading during the filter shows `user_audit`, stays collapsed (citations refreshed at 25a4ae75c) | ✓ "filter shows a secondary database that loads during the filter" (ran at 25a4ae75c) | `components/VirtualTableListConnections.spec.ts:400` - `.toBe(false)` before; `:405-406` - `.toBe(true)` after the commit, `audit` `expanded).toBe(false)`. Here "collapsed" means the user's stored expansion; by rule 4 the filter draws this node open | PASS |
| C43 | clearing the filter restores the state from before it and keeps a click made during it (citations refreshed at 25a4ae75c) | ✓ "clearing the filter restores secondary expansion" (ran at 25a4ae75c) | `components/VirtualTableListConnections.spec.ts:420-421` - `connection::7").expanded).toBe(false)`, tables `.toBe(false)`; `:426` - `vm.handleExpand(null, item(vm, "connection::7"))` while filtering; `:431-432` - `expanded).toBe(true)`, `users` displayed after clearing (F3 killed in round 3) | PASS |
| C44 | badge `3 / 7` with C's loaded default `shop` and loading `audit` (refreshed) | ✓ "badge counts secondary connections" (ran at 25a4ae75c) | carried from 66e4a754b - `components/TableListFilterBadge.spec.ts:72` - fixture `database: "shop"`; `:79` - `badge(mountTableList([], secondary))).toBe("3 / 7")` (F1, the round-2 survivor, killed: `expected '2 / 5' to be '3 / 7'`) | PASS |
| C45 | app-database `OpenTab.matches` compares the target, both directions | ✓ "app database tab matching compares the target connection" (ran at 25a4ae75c) | carried from 66e4a754b - `common/appdb/tabTargetConnection.spec.ts:37-39` - `tab(null).matches(tab(7), 'a')).toBe(false)`, `tab(7).matches(tab(null), 'a')).toBe(false)`, `tab(7).matches(tab(7), 'a')).toBe(true)` | PASS |

`tree-filter-all-databases` C3, the second check in this round's scope (`verified at 25a4ae75c`):

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| tree-filter C3 | with filter `use`, a database in each of `idle`, `loading`, `error`, locked is displayed, stored `expanded` false, drawn closed, childless; table-driven over the 4 | ✓ "keeps unloaded database nodes collapsed (idle)" · ✓ "(loading)" · ✓ "(error)" · ✓ "(locked)" (ran at 25a4ae75c) | `components/VirtualTableListFilter.spec.ts:151-156` - `it.each` over `idle`, `loading` (`status: "loading"`), `error` (`status: "error"`), `locked` (`inaccessibleDatabases: ["d"]`); `:167` - `expect(vm.displayItems).toContain(d)`; `:168` - `expect(d.expanded).toBe(false)`; `:170` - `expect(vm.isOpen(d)).toBe(false)`; `:171` - `expect(vm.displayItems.filter((i: any) => i.parent === d)).toEqual([])`. F4 kills `(loading)`; F5 kills `(idle)`, `(loading)` and `(error)`; F6 kills `(error)`, each at `:170` | PASS |

There is no precision gap left. Round 3 found that "collapsed" was used in two senses. C41 and C3
now say "stored `expanded` false and drawn closed (`isOpen` false)" and assert both. C42 keeps the
stored sense, and its text says so explicitly ("stays collapsed" next to rule 4's opened-by-filter
display).

## Coverage

The two rows that the round-3 finding left open were recomputed and are `verified at 25a4ae75c`.
Their authority is `tree-filter-all-databases` AC 3 (`plan.md:75-80`, reached from AC 20) and the
code that decides the drawn state: `isOpen` and `openedByFilter` at `VirtualTableList.vue:421-430`,
and `filteredOut` at `:432-435`.

`openedByFilter` returns `false` for every node without a match, and `!locked` for a database
that has one. An unloaded database (idle, loading, error) has no loaded entities, so its
`hasMatch` is false, and it is drawn closed by that guard. A locked database is drawn closed by
the `!locked` return. The fix added assertions only and changed no source branch, so it created
no member.

Every other row is `carried from 66e4a754b`: neither its authority nor its proofs changed in
`92237c2ed..25a4ae75c`. The sweep for sets that have no row is also carried.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Landing doors (3) - carried from 66e4a754b | plan Landing | door 1 C10, C21 · door 2 C23, C28, C45 · door 3 C6, C9 | - |
| `connectionTreeScope` values (4) - carried from 66e4a754b | door 3 + `ConnectionTreeModule.ts:90-93` | absent C1, C3 · `off` C6, C9 · `pinned` C6 · `all` C2, C6 | - |
| listed-connection sources (2) - carried from 66e4a754b | `ConnectionTreeModule.ts:95-104` | pins C1 · full saved list C2 | - |
| connections never listed (3) - carried from 66e4a754b | AC 1, 2, 8 | window's own C2 · unsaved window config C8 · pin to an id never saved C8 | - |
| saved-connection changes (5) - carried from 66e4a754b | AC 7 | pin, rename, recolor, create, delete C7 | - |
| connection node states (4) - carried from 66e4a754b | `ConnectionTreeModule.ts:21` + `StatelessConnectionItem.vue:33-48` | idle C17 · connecting C12 · connected C11, C14 · error C13 | - |
| node transitions (4) - carried from 66e4a754b | AC 9-11, 16 | idle→connecting C11 · connecting→error C13 · error→connecting via Retry C13 · connected→idle C18 | - |
| secondary item kinds (5) - carried from 66e4a754b | AC 12 + `VirtualTableList.vue:330-360` | connection C5, C14 · database C14 · locked database C39 · schema group C39 · entity C14, C39 | - |
| secondary dialect shape (2) - carried from 66e4a754b | AC 12 | multiple databases C14 · `multipleDatabases` disabled C14 | - |
| ephemeral prompts (2) - carried from 66e4a754b | AC 15 | CockroachDB JWT C17 · Snowflake MFA C40 | - |
| ephemeral prompt outcomes (2) - carried from 66e4a754b | AC 15 | cancelled C17, C40 · value given C17, C40 | - |
| filter rules on secondary connections, `tree-filter-all-databases` AC 1-6 (6) - verified at 25a4ae75c | AC 20 → `tree-filter-all-databases/plan.md:75-80` + `VirtualTableList.vue:421-435` | 1 match shown C22 · 2 loaded without a match hidden C22 · 3 unloaded displayed, collapsed as stored and as drawn, childless C41 `:386`, `:387`, `:389`, `:390` (F2 killed in round 3; F4, F5, F6 killed at `:389` this round) · 4 loads while filtering C42 · 5 expansion restored, before and during the filter C43 (F3 killed in round 3) · 6 badge incl. a secondary's default database C44 (F1 killed in round 3) | - |
| secondary database states while filtering (5) - verified at 25a4ae75c | `tree-filter-all-databases` AC 3 + `openedByFilter` `VirtualTableList.vue:425-430` + `filteredOut` `:432-435` | idle `audit` C41 `:389` (F5 killed) · loading `reports` C41 `:377`, `:389` (F4, F5 killed) · error `staging` C41 `:376`, `:389` (F5, F6 killed) · locked `secret` C41 `:375`, `:389` (`openedByFilter` returns `!locked`, `:428`) · loaded C22 | - |
| expansion sources restored on clear, secondary (2) - carried from 66e4a754b | `tree-filter-all-databases` AC 5 + `handleExpand` `VirtualTableList.vue:558-570` | before the filter C43 `:418` · clicked during the filter C43 `:424`, `:429` (F3 killed) | - |
| Disconnect guard (3) - carried from 66e4a754b | AC 17 | active transaction C19 · reserved connection C19 · neither C19 | - |
| Disconnect guard sources (2) - carried from 66e4a754b | `TabQueryEditor.vue:1185`, tree menu | query tab `busyOnConnection` + watcher C19 · tree menu `disabled` class C19 | - |
| session teardown places (3) - carried from 66e4a754b | Flow 8 | node Disconnect C18 · window `disconnect` / `rollbackConnection` C20 · utility `close` C21 | - |
| messages that must carry the child sId (8) - carried from 66e4a754b | plan Impact + `ElectronUtilityConnectionClient.ts` | `conn/create` C11 · `conn/listTables` C15 · `conn/selectTop` C24 · `conn/query`, `query/execute`, `query/cancel` C25 · `conn/resetTransactionTimeout` C30 · copy sends C30 | - |
| tab-rendered files reading window state (18) - carried from 66e4a754b | round-1 sweep | 16 components + fk_click C29 · tableMenu C30 | - |
| tabs that provide their connection to children (3) - carried from 66e4a754b | `TableTable.vue:359`, `TabTableProperties.vue:178`, `TabQueryEditor.vue:620` | TableTable, TabTableProperties, TabQueryEditor C29 | - |
| window reads per tab (8) - carried from 66e4a754b | `TabDatabase.ts` | all 8 C29; `usedConfig` C31; database list C32 | - |
| tab entry points on secondary nodes (4) - carried from 66e4a754b | AC 21-22 | View Data, View Structure C24 · New query on connection and database C25 | - |
| `targetConnectionId` values (3) - carried from 66e4a754b | door 2 | `null` C34 · open C24 · missing C26 | - |
| tab target lifecycle (2) - carried from 66e4a754b | AC 24 | opened now C24 · restored C27 | - |
| secondary node menus (3) - carried from 66e4a754b | AC 31 | connection, database, entity C35 | - |
| status bar color sources (4) - carried from 66e4a754b | AC 32-33 | secondary tab, window tab, without an active tab, `default` color C37 · switch C38 | - |

## Test policy rows

"Decides, not reached across a boundary" was unmet in round 3. It was re-judged and is `verified
at 25a4ae75c`. The other three rows classify no file the fix touched (the fix changed two spec
files and no source), so they are `carried from 66e4a754b`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (utility IPC session routing) - carried from 66e4a754b | `handlerState.ts`, `utility.ts`, `ElectronUtilityConnectionClient.ts` | boundary C11, C13, C24, C25, C27 · own layer C10, C21 | yes |
| Decides, not reached across a boundary - verified at 25a4ae75c | `ConnectionTreeModule.ts`, `VirtualTableList.vue` connection level and filter rules, `TableList.vue` badge | one asserted case per row of each decision table | yes. The rows that were open in round 3 now each have an asserted case at their own layer, by mounting `VirtualTableList`. The drawn outcome of `openedByFilter` while filtering is asserted as `isOpen(node) === false` for idle, loading, error and locked databases on a secondary connection (C41 `VirtualTableListConnections.spec.ts:389`) and on the window (tree-filter C3 `VirtualTableListFilter.spec.ts:170`). The opened-by-filter outcome for a database with a match is carried in C22 and C42. F4, F5 and F6 at `VirtualTableList.vue:426` are each killed. The badge rows (C44, F1) and the click-during-filter row (C43, F3) are carried from 66e4a754b |
| Instrumentation - carried from 66e4a754b | none in this diff | none of its own | yes (n/a) |

## Swept rows

`carried from 66e4a754b`. None of the `Swept` rows resolves to an existing constraint. Each one
points at a check that ran green above, and `observability: n/a` is approved policy.

## Faults injected

F4, F5 and F6 are `verified at 25a4ae75c`. F1-F3 are `carried from 66e4a754b`.

Each round-4 fault was an in-place mutation of the committed source file, per the brief's
isolation rule (no worktree, no stash). Before each fault, `git status --porcelain` printed
`baseline:[]`. After each one, `git checkout -- apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue`
restored the file, and the command printed `after:[]`. Test files were never modified.

Each fault inserted one line directly before the `hasMatch` guard
(`if (!this.filtering || !item.hasMatch) return false;`, `VirtualTableList.vue:426`). Each was run
against the narrowest covering proofs: the C41 selector and the tree-filter C3 selector, from
`apps/studio/`:

```
yarn -s vitest:unit tests/vitest/unit/components/VirtualTableListConnections.spec.ts tests/vitest/unit/components/VirtualTableListFilter.spec.ts -t "filter keeps unloaded secondary nodes collapsed|keeps unloaded database nodes collapsed" --reporter=verbose
```

F6 is the one extra fault this round, chosen on the same surface. F5 fails C41 at its first
unloaded database (`audit`, idle), so C41's `error` member had never been made to fail on its
own. F6 opens only the error database, which isolates that member.

Paths are under `apps/studio/src/`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (round 2) badge secondary term skips each connection's default database (carried from 66e4a754b) | `components/sidebar/core/TableList.vue:259` | yes - carried from 66e4a754b: "badge counts secondary connections", `expected '2 / 5' to be '3 / 7'` |
| F2 `filteredOut` drops a `loading` database without a match (carried from 66e4a754b) | `components/sidebar/core/table_list/VirtualTableList.vue:434` | yes - carried from 66e4a754b: "filter keeps unloaded secondary nodes collapsed", `expected [ Array(11) ] to include { type: 'database', … }` |
| F3 `handleExpand` leaves a connection node's stored expansion alone while filtering (carried from 66e4a754b) | `components/sidebar/core/table_list/VirtualTableList.vue:560` | yes - carried from 66e4a754b: "clearing the filter restores secondary expansion", `expected false to be true` (now at `VirtualTableListConnections.spec.ts:431`) |
| F4 (round 3) `openedByFilter` opens a `loading` database while filtering: `if (this.filtering && item.type === "database" && (item as DatabaseItem).status === "loading") return true;` | `components/sidebar/core/table_list/VirtualTableList.vue:426` | yes - 2 failed, 3 passed: × "filter keeps unloaded secondary nodes collapsed" `AssertionError: expected true to be false` at `VirtualTableListConnections.spec.ts:389:31`; × "keeps unloaded database nodes collapsed (loading)" at `VirtualTableListFilter.spec.ts:170:26`; idle, error, locked cases ✓ |
| F5 (round 3) `openedByFilter` opens every unlocked database that is not loaded: `if (this.filtering && item.type === "database" && !(item as DatabaseItem).locked && (item as DatabaseItem).status !== "loaded") return true;` | `components/sidebar/core/table_list/VirtualTableList.vue:426` | yes - 4 failed, 1 passed: × C41 at `VirtualTableListConnections.spec.ts:389:31`; × "(idle)", × "(loading)", × "(error)" at `VirtualTableListFilter.spec.ts:170:26`; "(locked)" ✓ (the mutant leaves locked databases alone) |
| F6 `openedByFilter` opens an `error` database while filtering: `if (this.filtering && item.type === "database" && (item as DatabaseItem).status === "error") return true;` | `components/sidebar/core/table_list/VirtualTableList.vue:426` | yes - 2 failed, 3 passed: × C41 at `VirtualTableListConnections.spec.ts:389:31` (only `staging` is opened); × "(error)" at `VirtualTableListFilter.spec.ts:170:26` |

## Gate

From `apps/studio/`, at `25a4ae75c`:

- The whole unit suite (`yarn -s vitest:unit`) exited 0: `Test Files 166 passed (166)`, `Tests
  3682 passed | 1 todo (3683)`.
- The proof batch (19 files) exited 0: 98 passed, 0 failed, 1 todo.
- `git status --porcelain` is empty after the fault runs. Only this report was written.

`python3 /Users/thiago/.claude/skills/tlc-spec-lean/scripts/validate_verification.py multi-connection-tree`,
run from the repo root:

```
validate_verification: 0 error(s), 0 warning(s) across [multi-connection-tree]
```

Exit 0.
