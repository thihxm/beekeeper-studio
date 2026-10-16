# Multi-database polish verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: a872950f2^..bda383924
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 32 proofs run green at `bda383924`, and every named test exists and ran individually. **4 of 5 injected
wiring faults survive both full suites**, so the verdict is FAIL (verify.md: a surviving mutant fails the
feature). The survivors are all in the seams between unit-tested pieces: the tree never listens for the reveal
event (F1), labels are never loaded on connect (F2), the color modal never saves (F4), and the utility IPC route
for the privilege list returns nothing (F5). Three check rows are marked FAIL as level gaps (C15, C16, C22): each
claim starts at a user action or an event that its proof skips.

Profile `light`: there is no binding-source step and no Coverage recompute. Fault injection ran because the brief
asked for it (cap 5), aimed at wiring that the hand-built unit contexts do not reach.

## Proof run (verified at bda383924)

All commands ran from `apps/studio/` in the main checkout at `bda383924`, with a clean tree.

- **Batched VU, one invocation:** `yarn vitest:unit <12 proof spec files> -t "<31 proof names, verbatim>" --reporter=verbose`.
  No check name contains an apostrophe. Result: exit 0, **12 files, 31 passed, 14 skipped**. All 31 VU proof
  names appear as their own `✓` line. The 14 skips are non-proof tests in the same files.
- **C1 (integration, Docker):** `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts` exit 0,
  1 file, 2 passed. Re-run with `-t "lists databases the role cannot connect to" --reporter=verbose`: exit 0,
  `✓ ... lists databases the role cannot connect to`, 1 passed, 1 skipped.
- **C14 grep proof (verbatim):** exit 0. `src/migration/20261016_create_database_labels.js:16` holds the unique index,
  and `src/migration/index.js:101` imports it. It is also registered in the migration list at `index.js:161`.
- **C24 grep proof (verbatim):** exit 0. `default.config.ini:84` - `revealActiveEntity = true` (under `[ui.tableList]`), and `bksConfig.d.ts` count 1.
- **Full `yarn vitest:unit`:** exit 0, **60 files, 2728 passed, 0 failed, 1 todo**.
- **Full legacy Jest `yarn test:unit`:** exit 0, **80 suites, 799 passed, 0 failed**.
- The sibling feature's test-only commits (`95636bfd0`, `d0892f30f`, `3e8f64a97`) break none of these proofs.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | role w/o CONNECT: list contains `secret`, not `a` | VI exit 0, test ran (`✓`) | `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:86` - `expect(inaccessible).toContain("secret")`; `:87` - `not.toContain("a")` | PASS |
| C2 | SQL Server SQL has `HAS_DBACCESS(name) = 0`, returns names | batched VU, passed | `apps/studio/tests/vitest/unit/lib/db/inaccessibleDatabases.spec.ts:16` - `toContain('HAS_DBACCESS(name) = 0')`; `:18` - `toEqual(['finance', 'hr'])` | PASS |
| C3 | non-overriding client (MySQL) returns `[]` | batched VU, passed | `inaccessibleDatabases.spec.ts:26` - `toEqual([])`; `:27` - no driver query | PASS |
| C4 | 4 driver errors -> `DATABASE_ACCESS_DENIED` | batched VU, passed | `apps/studio/tests/vitest/unit/handlers/accessDenied.spec.ts:37-40` (42501, errno 1044, number 916, nested number 4060), `:42` - `toHaveLength(4)`, `:46` - `rejected.code).toBe(DATABASE_ACCESS_DENIED)` per case. All 4 covered; the MySQL case also carries `code: ER_DBACCESS_DENIED_ERROR`, so errno 1044 alone is not isolated (both are recognised by the plan) | PASS |
| C5 | 28P01 rethrown as the same object | batched VU, passed | `accessDenied.spec.ts:57` - `expect(rejected).toBe(error)`; `:58` - `code).toBe("28P01")` | PASS |
| C6 | utility `errorCode` becomes `err.code` | batched VU, passed | `apps/studio/tests/vitest/unit/lib/utility/UtilityConnection.spec.ts:20` - `toBeInstanceOf(Error)`; `:22` - `code).toBe("DATABASE_ACCESS_DENIED")` | PASS |
| C7 | list -> `["secret"]`; on reject `[]` and list still committed | batched VU, passed | `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:130` - `toEqual(["secret"])`; `:138` - `toEqual([])`; `:139` - `databaseList).toEqual(["a","b","c"])`. Note: proof mocks renderer `send`, so the utility handler is outside it (F5) | PASS |
| C8 | access denied on load -> `b` locked | batched VU, passed | `databaseEntities.spec.ts:145` (rejects with code), `:152` - `inaccessibleDatabases).toContain("b")` | PASS |
| C9 | class, icon, aria-disabled, tabindex; 0 loads | batched VU, passed | `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:211` - `toContain("locked")`; `:212` - `.lock-icon` exists; `:213` - `aria-disabled` `"true"`; `:214` - `tabindex` `"0"`; `:218` - `toHaveBeenCalledTimes(0)`. All 4 attributes, full mount (F3 killed) | PASS |
| C10 | tooltip text with/without username, trigger `hover focus` | batched VU, passed | `VirtualTableList.spec.ts:230-233` - `__tooltip).toEqual({ content: "... account (app_user)", trigger: "hover focus" })`; `:239` - content without username. Both triggers and both texts | PASS |
| C11 | after clear, `inaccessibleDatabases` `[]` | batched VU, passed | `databaseEntities.spec.ts:77` - `inaccessibleDatabases).toEqual([])` (via `disconnect`, which commits `clearConnection`) | PASS |
| C12 | locked db: 0 index items | batched VU, passed | `apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:39` - `fromWarehouse).toHaveLength(0)` (loaded `warehouse` plays `b`); `:40` - databases `toEqual(["a"])` | PASS |
| C13 | tab on locked `b` shows message, no slot | batched VU, passed | `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:58` - `toContain("No permission to access database b with the current account")`; `:59` - `.table-slot` absent | PASS |
| C14 | unique index; 2 saves -> 1 row, second color | grep exit 0 + batched VU, passed | `src/migration/20261016_create_database_labels.js:16` (index); `apps/studio/tests/vitest/unit/common/appdb/databaseLabels.spec.ts:21` - `toHaveLength(1)`; `:22` - `color).toBe('purple')`; `:27` - duplicate rejects `/UNIQUE/i` | PASS |
| C15 | choosing purple dispatches the save; bar class purple | batched VU, both passed | `apps/studio/tests/vitest/unit/store/databaseLabels.spec.ts:33-35` - IPC `setColor` payload; `VirtualTableList.spec.ts:248` - `toContain("connection-label-color-purple")`. **Level gap:** the store proof starts at `dispatch`, not at "choosing"; the Set color menu -> `DatabaseColorModal.save` -> dispatch path has no proof, and F4 (modal never dispatches) survives | FAIL |
| C16 | choosing default sends remove; bar has no color class | batched VU, both passed | `databaseLabels.spec.ts:46` - `toHaveBeenCalledWith("appdb/databaseLabels/remove", ...)`; `:47` - `colorFor("b")).toBeNull()`; `VirtualTableList.spec.ts:249` - no `connection-label-color-` class. **Level gap** as C15 (F4 survives); the bar half samples a never-colored `b`, not a removal | FAIL |
| C17 | stripe and badge purple on `b`; green on default | batched VU, passed | `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:40` - stripe purple; `:41` - badge purple; `:44` - stripe green; `:45` - badge green. Stripe and badge both | PASS |
| C18 | unsaved: store updated, 0 label requests | batched VU, passed | `databaseLabels.spec.ts:54` - `colorFor("b")).toBe("purple")`; `:55` - `toHaveLength(0)` | PASS |
| C19 | `load` sends find with `where {connectionId:3, workspaceId:-1}` | batched VU, passed | `databaseLabels.spec.ts:62` - `toHaveBeenCalledWith("appdb/databaseLabels/find", { options: { where: { connectionId: 3, workspaceId: -1 } } })`; `:63`. Claim proven as written; AC 19's "when a saved connection connects" trigger is unproven (F2 survives) | PASS |
| C20 | key `b::table.public.users` / `table.public.users`; header commits it | batched VU, passed | `apps/studio/tests/vitest/unit/components/revealActiveEntity.spec.ts:73` - `toBe("b::table.public.users")`; `:74` - `toBe("table.public.users")`; `:84` - `commit` `selectSidebarItem`; `:85` - `trigger(AppEvent.revealSidebarItem, ...)`. Watcher run on a hand-built context | PASS |
| C21 | view key `view.public.v` | batched VU, passed | `revealActiveEntity.spec.ts:90` - `toBe("view.public.v")` | PASS |
| C22 | selecting with reveal on: expand `b` + schema, load, scroll to index | batched VU, passed | `revealActiveEntity.spec.ts:101` - `b().expanded).toBe(true)`; `:103` - load `{ database: "b", force: false }`; `:111` - schema `expanded` true; `:114` - `scrollToIndex).toHaveBeenCalledWith(index)`. Expand, load and scroll all asserted. **Level gap:** the test calls `vm.revealItem` directly; the `revealSidebarItem` root binding that connects "selecting" to it is unproven, and F1 (binding removed) survives | FAIL |
| C23 | reveal off: no expansion change, 0 scrolls | batched VU, passed | `revealActiveEntity.spec.ts:125` - expansion `toEqual(before)`; `:126` - `scrollToIndex` x0; `:127` - load x0. Passes trivially when the event binding is missing (F1) | PASS |
| C24 | ini declares `revealActiveEntity = true`, typed | grep exit 0 | `apps/studio/default.config.ini:84` - `revealActiveEntity = true` under `[ui.tableList]`; `bksConfig.d.ts` count 1 | PASS |
| C25 | 3 entries, all 3 fields each | batched VU, passed | `apps/studio/tests/vitest/unit/services/pluginDatabases.spec.ts:48-52` - `toEqual([{a,true,true,null},{b,false,false,null},{c,false,true,"purple"}])`. Every field of every entry | PASS |
| C26 | multipleDatabases disabled -> `[]` | batched VU, passed | `pluginDatabases.spec.ts:57` - `toEqual([])` | PASS |
| C27 | `database:"b"` sent; omitted -> no key | batched VU, passed | `pluginDatabases.spec.ts:70` - `toMatchObject({ queryText: "select 1", database: "b" })`; `:75` - `not.toHaveProperty("database")`; `:79` - driver error passes through. With and without database | PASS |
| C28 | query tab `b`/default `a`; table tab resolves `b`'s orders | batched VU, passed | `pluginDatabases.spec.ts:93` - `databaseName: "b"`; `:94` - `databaseName: "a"`; `:97` - `"b"`; `:98` - `data.table).toBe(ordersB)` | PASS |
| C29 | connection info keeps default `a` | batched VU, passed | `pluginDatabases.spec.ts:103` - `databaseName).toBe("a")` | PASS |
| C30 | bridge routes `getDatabases` and `runQuery` database | batched VU, passed | `pluginDatabases.spec.ts:119-120` - `getDatabases` x1, result posted; `:124` - `runQuery).toHaveBeenCalledWith("select 1", "b")` | PASS |
| C31 | disconnected -> noDatabase message | batched VU, passed | `pluginDatabases.spec.ts:62` - `toThrow("No database connection found")`, the same text as `errorMessages.noDatabase` at `src/handlers/handlerState.ts:103` | PASS |
| C32 | locked database -> code `DATABASE_ACCESS_DENIED` | batched VU, passed | `pluginDatabases.spec.ts:87` - `rejected.code).toBe("DATABASE_ACCESS_DENIED")` | PASS |

Swept re-read: no `Swept` row resolves to an existing constraint (each cites checks or `n/a`). The authorization
row (C1, C4, C9) is backed: C1 runs against a real Postgres role, C4 covers all 4 driver codes, and C9 is a full
mount where F3 is killed.

## Faults injected

Isolation: `git worktree add --detach /private/tmp/claude-503/verify-polish-faults HEAD`, with symlinks to the main
checkout's root, `apps/studio` and `apps/ui-kit` `node_modules`, and to `apps/ui-kit/dist`. Baseline: the scratch
proof files passed unmutated. A script applied each fault as one exact-substring replacement (asserting a single
match), ran `yarn vitest:unit` over the 12 proof spec files plus `store/UnsavedConnectionTabs.spec.ts` (all tests, not
filtered), then ran `git checkout -- <file>` and asserted the source was clean. The 4 survivors were then applied
together and both full suites were run: `yarn vitest:unit` gave 60 files, 2728 passed, 0 failed, and `yarn test:unit`
gave 80 suites, 799 passed. The worktree was removed with `git worktree remove --force` and pruned. `git status
--porcelain` of the main tree was empty before and after (diffed, identical).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 drop root binding `{ event: AppEvent.revealSidebarItem, handler: this.revealItem }` | `apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue:447` | no - survived proof files and both full suites; the tree never reveals on tab activation (C22) |
| F2 drop `await this.$store.dispatch('databaseLabels/load')` on connect | `apps/studio/src/components/CoreInterface.vue:147` | no - survived proof files and both full suites; colors never load after a reconnect (AC 19) |
| F3 `Item.vue` passes `:locked="false"` to `StatelessDatabaseItem` | `apps/studio/src/components/sidebar/core/table_list/Item.vue:7` | yes - `VirtualTableList.spec.ts` `locked database is dimmed and does not expand` and `locked database explains why on hover and focus` (2 failed) |
| F4 `DatabaseColorModal.save` no longer dispatches `databaseLabels/setColor` | `apps/studio/src/components/sidebar/core/DatabaseColorModal.vue:56` | no - survived proof files and both full suites; Set color does nothing (C15, C16) |
| F5 utility route `conn/listInaccessibleDatabases` returns `[]` instead of the client's list | `apps/studio/src-commercial/backend/handlers/connHandlers.ts:422` | no - survived proof files and both full suites; proactive locking never happens (AC 7, door 2 IPC) |

## Ranked gaps

1. **Reveal is never wired in any test (F1)** - C22 - `revealActiveEntity.spec.ts:100` calls `vm.revealItem` directly,
   and C23 (`:122`) emits the event but expects nothing, so it passes with no listener. Needed: with reveal on,
   emit `AppEvent.revealSidebarItem` on `$root` (or activate a mounted `CoreTabHeader`) and assert expansion and
   scroll.
2. **The Set color flow has no proof above the store (F4)** - C15, C16 - `databaseLabels.spec.ts:31` dispatches directly.
   Needed: open `DatabaseColorModal` with `AppEvent.openDatabaseColorModal`, submit, and assert the dispatch
   payload. The `Set color` menu entry in `VirtualTableList.databaseMenuOptions` is unproven too.
3. **Labels load on connect is unproven (F2)** - AC 19 / C19 - `CoreInterface.vue:147` is not exercised by any spec.
4. **The utility IPC route for the privilege list is unproven (F5)** - AC 7, door 2 - C7 mocks renderer `send` by channel
   name and C1 calls the client directly, so `ConnHandlers['conn/listInaccessibleDatabases']` sits between two proofs.
   A unit test on the handler with a stub `connectionFor` would close it.

Non-blocking observations:
- Door 1's literal shape says `version integer NOT NULL DEFAULT 1`, but the migration uses `DEFAULT 0`
  (`20261016_create_database_labels.js:13`). This matches every other appdb migration, so the plan's literal is
  likely the error. No check covers it.
- C4's MySQL case sets both `errno: 1044` and `code: ER_DBACCESS_DENIED_ERROR`, so a regression that drops
  errno matching alone would pass.
- C20 runs the `activeTab` watcher on a hand-built context, not a mounted header. The real watcher function is
  used, so this is weaker than a mount but not a stand-in.

## Gate

- `yarn vitest:unit <12 proof files> -t "<31 proof names>" --reporter=verbose`: 12 files, 31 passed, 0 failed, 14 skipped (none is a proof). Exit 0, at bda383924.
- `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts`: 2 passed, exit 0. The verbose `-t` re-run shows C1 passed individually.
- C14 and C24 grep proofs: exit 0.
- `yarn vitest:unit` (full): 60 files, 2728 passed, 0 failed, 1 todo. Exit 0.
- `yarn test:unit` (full legacy Jest): 80 suites, 799 passed, 0 failed. Exit 0.
- Faults: 5 injected, 1 killed (F3), 4 survived (F1, F2, F4, F5).

Gate outcome: every proof is green, but 4 wiring mutants survive and C15, C16 and C22 have level gaps. **FAIL.**
