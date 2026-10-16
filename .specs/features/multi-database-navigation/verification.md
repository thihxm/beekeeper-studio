# Multi-database navigation verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 78f8c858d^..d0892f30f
**Round**: 6 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 6 covers the fix commit `d0892f30f` (diff `95636bfd0..d0892f30f`) and the Round 5 FAIL, which was caused by
surviving mutants F10 and F11. The fix touches no source. It adds one spec,
`apps/studio/tests/vitest/unit/components/tabDatabaseProvide.spec.ts` (59 lines, 3 cases), and rewrites the
previous `verification.md`. `git diff --stat 95636bfd0..d0892f30f -- apps/studio/src` is empty.

**All 38 checks are proven at `d0892f30f`. F10, F11 and the new F12 (the `TabQueryEditor` provide) are all killed.
Round 5's F4 and F6 spot checks are still killed, and 3 extra mutants on `TabDatabaseMixin` and the store's
`connectionFor` getter are killed too.** Every fault this round was killed (8/8). Combined with Round 5's kills of
F1-F9, which the fix could not have touched, no known mutant survives.

Profile `light`: there is no binding-source step and no Coverage recompute. Fault injection ran because the user
asked for this round after Round 5 failed on surviving mutants.

## Proof run (verified at d0892f30f)

All commands ran from `apps/studio/` in the isolated worktree at `d0892f30f`.

- **Batched VU, one invocation:** `yarn vitest:unit <13 proof spec files> tests/vitest/unit/components/tabDatabaseColumns.spec.ts tests/vitest/unit/components/tabDatabaseProvide.spec.ts -t "<alternation>" --reporter=verbose`.
  The alternation holds the 39 VU proof names from `checks.md` verbatim, plus the `tabDatabaseColumns` and
  `tabDatabaseProvide` describe names and 3 `databaseEntities` regression tests. The 3 regression tests are
  matched by substring: `loads columns of another database`, `lists tables, views and materialized views at once`
  and `columns load through the default connection`. No check name contains an apostrophe.
  Result: exit 0, **15 files, 53 passed, 11 skipped**. Each of the 39 proof names matched at least one `✓` line
  (checked by script). The run is Round 5's 50 plus the 3 new `tabDatabaseProvide` cases. The 11 skips are the same
  non-proof tests as in Round 5.
- **C26 and C27:** both grep proofs ran verbatim, exit 0, same output as Round 5.
- **C18 (integration):** carried from `95636bfd0`. The fix touches no utility, handler, db or store code, so the
  Round 5 run against a real postgres:16 container (exit 0, 2 passed) still stands. It was not re-run.
- **Full `yarn vitest:unit`:** exit 0, **58 files, 2716 passed, 0 failed, 1 todo**. That is +1 file and +3 tests over
  Round 5, all from the new spec.
- **Full legacy Jest `yarn test:unit`:** exit 0, **80 suites, 799 passed, 0 failed** (same as Round 5).

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | null / active db -> `state.connection`, 0 creates | batched VU, passed at d0892f30f | carried from e122bdff5 (file unchanged): `apps/studio/tests/vitest/unit/handlers/connectionFor.spec.ts:69` - `toBe(active)`; `:72` - `createConnection` x0 | PASS |
| C2 | 2 calls for `b` -> 1 create, 1 connect, same client | batched VU, passed at d0892f30f | carried from e122bdff5: `connectionFor.spec.ts:78` - `expect(first).toBe(second)`; `:80`, `:82` - x1 | PASS |
| C3 | connect rejects -> same error, `server.db["b"]` undefined | batched VU, passed at d0892f30f | carried from e122bdff5: `connectionFor.spec.ts:99` - `rejects.toBe(error)`; `:100` - `toBeUndefined()` | PASS |
| C4 | one client disconnect keeps tunnel, no shutdown | batched VU, passed at d0892f30f | carried from e122bdff5: `apps/studio/tests/vitest/unit/lib/db/serverClientCache.spec.ts:34` - `sshTunnel).not.toBeNull()`; `:35` | PASS |
| C5 | `conn/disconnect` disconnects 2/2 clients, tunnel null | batched VU, passed at d0892f30f | carried from e122bdff5: `connectionFor.spec.ts:118-120` | PASS |
| C6 | SurrealDB cached under `ns::db` | batched VU, passed at d0892f30f | carried from e122bdff5: `serverClientCache.spec.ts:43` - `toBe(first)`; `:44` | PASS |
| C7 | `forDatabase("b")` sends `database:"b"` on 4 calls; default sends none | batched VU, both passed at d0892f30f | carried from e122bdff5: `apps/studio/tests/vitest/unit/lib/utility/ElectronUtilityConnectionClient.spec.ts:27` - `toMatchObject({ database: "b" })`; `:37` - `not.toHaveProperty("database")` | PASS |
| C8 | `conn/listTables {database:"b"}` hits `server.db["b"]` only | batched VU, passed at d0892f30f | carried from e122bdff5: `connectionFor.spec.ts:107-108` | PASS |
| C9 | 2 dispatches -> 1 `conn/listTables` with `b`, loaded, `tablesFor("b")` | batched VU, passed at d0892f30f | carried from 95636bfd0 (file unchanged by fix): `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:44-47` | PASS |
| C10 | loading while pending, then error + driver message | batched VU, passed at d0892f30f | carried from 95636bfd0: `databaseEntities.spec.ts:58` - `"loading"`; `:63` - `"error"`; `:64` - driver message | PASS |
| C11 | store `disconnect` -> `databaseEntities` `{}` | batched VU, passed at d0892f30f | carried from 95636bfd0: `databaseEntities.spec.ts:76` - `toEqual({})` | PASS |
| C12 | 3 db rows, `a` expanded with tables, `b`/`c` collapsed | batched VU, passed at d0892f30f | carried from 95636bfd0: `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:109-110`, `:112-113` | PASS |
| C13 | expanding `b` dispatches load once; its schema and table rows render under `b` | batched VU, passed at d0892f30f | carried from 95636bfd0: `VirtualTableList.spec.ts:121-122`, `:134`, `:136` | PASS |
| C14 | loading indicator; error + retry re-dispatches `b` | batched VU, passed at d0892f30f | carried from 95636bfd0: `VirtualTableList.spec.ts:147`, `:155`, `:159-160` | PASS |
| C15 | collapse `a` -> 0 descendants | batched VU, passed at d0892f30f | carried from 95636bfd0: `VirtualTableList.spec.ts:167`, `:174` | PASS |
| C16 | `multipleDatabases` disabled -> 0 db rows, schemas top-level | batched VU, passed at d0892f30f | carried from 95636bfd0: `VirtualTableList.spec.ts:181`, `:183` | PASS |
| C17 | pin and hidden entity with `databaseName "b"` apply only under `b` | batched VU, passed at d0892f30f | carried from 95636bfd0: `VirtualTableList.spec.ts:199-202` | PASS |
| C18 | real Postgres: `connectionFor(sId,"b").listTables()` has `tb` not `ta`, active stays `a` | carried from 95636bfd0 (VI against postgres:16, exit 0); the fix touches no utility/db code, so it was not re-run | carried from 95636bfd0: `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:72-74` | PASS |
| C19 | limit 2, `b` LRU -> disconnect `b`, remove, then create `d` | batched VU, passed at d0892f30f | carried from e122bdff5: `apps/studio/tests/vitest/unit/handlers/clientLifecycle.spec.ts:78-83` | PASS |
| C20 | none idle -> rejects with message containing `"2"`, no create for `d` | batched VU, passed at d0892f30f | carried from e122bdff5: `clientLifecycle.spec.ts:92-93` | PASS |
| C21 | idle 5001 ms evicted, 4000 ms kept | batched VU, passed at d0892f30f | carried from e122bdff5: `clientLifecycle.spec.ts:108-111` | PASS |
| C22 | sweep and limit never evict active / reserved / in-transaction | batched VU, passed at d0892f30f | carried from e122bdff5: `clientLifecycle.spec.ts:126-132` | PASS |
| C23 | evicted `b` recreated and `listTables` resolves | batched VU, passed at d0892f30f | carried from e122bdff5: `clientLifecycle.spec.ts:139`, `:143-144` | PASS |
| C24 | after `conn/disconnect`, 10x sweep interval -> no disconnect | batched VU, passed at d0892f30f | carried from e122bdff5: `clientLifecycle.spec.ts:156-158` | PASS |
| C25 | limit and sweep eviction keep the tunnel | batched VU, passed at d0892f30f | carried from e122bdff5: `clientLifecycle.spec.ts:169-172` | PASS |
| C26 | `[db.default] maxOpenDatabases = 5`, `idleDatabaseTimeout = 600000`, both typed | grep verbatim at d0892f30f, exit 0 | verified at d0892f30f: `apps/studio/default.config.ini:113` - `maxOpenDatabases = 5`; `:117` - `idleDatabaseTimeout = 600000 ; 10 Minutes`; `bksConfig.d.ts` - 27 occurrences each | PASS |
| C27 | migration registered, `ALTER TABLE ... "databaseName" varchar NULL`, in both `pickable` | grep verbatim at d0892f30f, exit 0 | verified at d0892f30f: `apps/studio/src/migration/20261015_add_tab_database_name.js:5`; `apps/studio/src/migration/index.js:100`; `apps/studio/src/common/appdb/models/OpenTab.ts:11`; `apps/studio/src/common/transport/TransportOpenTab.ts:12` | PASS |
| C28 | table + table-properties from `b` -> `databaseName:"b"`, saved | batched VU, passed at d0892f30f | carried from e122bdff5: `apps/studio/tests/vitest/unit/store/tabDatabase.spec.ts:61`, `:66`. Component level, carried from 95636bfd0: `apps/studio/tests/vitest/unit/components/tabDatabaseColumns.spec.ts:94` (F4 re-killed this round), `:122`, `:38`, `:52` | PASS |
| C29 | `connectionForTab` with `b` sends `database:"b"`; `null` -> default | batched VU, passed at d0892f30f | carried from e122bdff5: `tabDatabase.spec.ts:76` - `toMatchObject({ database: "b" })`; `:78` - `toBe(connection)`. Consumers, carried from 95636bfd0: `tabDatabaseColumns.spec.ts:142` (F6 re-killed this round), `:158`. Provide wiring, verified at d0892f30f: `apps/studio/tests/vitest/unit/components/tabDatabaseProvide.spec.ts:49-51` (tab `b` -> child `database` `b`, `connection.database` `b`), `:55-56` (null tab -> default `a` and default connection). These kill F10/F11/F12 and mixin mutants M1/M2 | PASS |
| C30 | new query tab persists `databaseName:"a"` | batched VU, passed at d0892f30f | carried from e122bdff5: `tabDatabase.spec.ts:88` | PASS |
| C31 | after `changeDatabase("c")`, `b` tab still resolves and sends `b` | batched VU, passed at d0892f30f | carried from e122bdff5: `tabDatabase.spec.ts:102`, `:104`, `:107`. Component level, carried from 95636bfd0: `tabDatabaseColumns.spec.ts:74-75`, `:173-175` | PASS |
| C32 | `matches` false for `a` vs `b`; true for `null` vs default `a` | batched VU, passed at d0892f30f | carried from e122bdff5: `apps/studio/tests/vitest/unit/transport/TransportOpenTab.spec.ts:10`, `:13` | PASS |
| C33 | selector writes tab `databaseName`, next run sends it; selector `disabled` while transaction / reserved | batched VU, both passed at d0892f30f | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/QueryDatabaseSelector.spec.ts:48`, `:54`, `:64`, `:75`, `:79-80`, `:84` | PASS |
| C34 | transaction timeout rolls back on client `b`, not active | batched VU, passed at d0892f30f | carried from e122bdff5: `connectionFor.spec.ts:133-134` | PASS |
| C35 | tab bound to `b`, table missing in `b` -> not-found text | batched VU, passed at d0892f30f | carried from 95636bfd0: `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:34-35` | PASS |
| C36 | 1 table item whose title includes the database name and `orders`, plus 2 database items | batched VU, passed at d0892f30f | carried from 95636bfd0: `apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:25-27`, `:32` | PASS |
| C37 | table result emits `loadTable` with `database:"b"`; database result expands, 0 `changeDatabase` | batched VU, both passed at d0892f30f | carried from e122bdff5: `apps/studio/tests/vitest/unit/components/QuickSearch.spec.ts:21`, `:28`, `:30` | PASS |
| C38 | query tab `databaseName "b"` shows `b` in header and selector; default `a` shows `a` | batched VU, both passed at d0892f30f | carried from e122bdff5: `QueryDatabaseSelector.spec.ts:35-38`; carried from 95636bfd0: `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:31`, `:34` | PASS |

Line citations: the only spec file the fix touched is `tabDatabaseProvide.spec.ts`, which is new and cited above at
`d0892f30f`. Every other cited file is byte-identical between `95636bfd0` and `d0892f30f`, so its Round 5
line numbers carry over.

## Faults injected

Isolation: a second worktree, `git worktree add --detach <scratchpad>/verify-r6-faults d0892f30f`, with the same 4
symlinks (root, `apps/studio` and `apps/ui-kit` node_modules, plus `apps/ui-kit/dist`). The script applied one
exact-substring replacement per fault, after asserting the original text was on the named line. It ran the
narrowest covering spec, then ran `git checkout -- src` and asserted `src` was clean before the next fault. After the
run, the scratch worktree was removed (`git worktree remove --force`) and pruned. The symlink targets in the main
tree were checked and are intact. `git status --porcelain` of `/Users/thiago/Dev/beekeeper-studio` and of the
verify worktree are byte-identical before and after (diffed).

| Mutation | Location | Killed |
| --- | --- | --- |
| F10 structure tab `provide` -> `tabDatabase: () => null` | `apps/studio/src/components/TabTableProperties.vue:174` | yes - `tabDatabaseProvide.spec.ts` `TabTableProperties children run on the tab database` (1 failed, 2 passed) |
| F11 table tab `provide` -> `tabDatabase: () => null` | `apps/studio/src/components/tableview/TableTable.vue:356` | yes - `tabDatabaseProvide.spec.ts` `TableTable children run on the tab database` (1 failed, 2 passed) |
| F12 query tab `provide` -> `tabDatabase: () => null` | `apps/studio/src/components/TabQueryEditor.vue:616` | yes - `tabDatabaseProvide.spec.ts` `TabQueryEditor children run on the tab database` (1 failed, 2 passed) |
| F4 (spot check) open (`initialize`) -> `dispatch('updateTableColumns', this.table)` | `apps/studio/src/components/tableview/TableTable.vue:1166` | yes - `tabDatabaseColumns.spec.ts` `opening a table tab loads columns from the tab's database` (1 failed, 7 passed) |
| F6 (spot check) schema submitApply -> `database: null` | `apps/studio/src/components/tableinfo/TableSchema.vue:410` | yes - `tabDatabaseColumns.spec.ts` `applying a structure change reloads columns from the tab's database` (1 failed, 7 passed) |
| M1 mixin `connection` ignores the tab -> `connectionFor(null)` | `apps/studio/src/mixins/TabDatabase.ts:14` | yes - `tabDatabaseProvide.spec.ts`, all 3 cases failed |
| M2 mixin `database` ignores the tab -> `this.$store.state.database` | `apps/studio/src/mixins/TabDatabase.ts:17` | yes - `tabDatabaseProvide.spec.ts`, all 3 cases failed |
| M3 store getter `connectionFor` ignores its argument -> `{ databaseName: null }` | `apps/studio/src/store/index.ts:224` | yes - `databaseEntities.spec.ts` (2 tests) and `tabDatabase.spec.ts` `bound tabs survive a default database change` (3 failed, 20 passed across 4 specs). `tabDatabaseProvide.spec.ts` does not see M3 because it stubs this getter |

Round 5's F1-F3, F5, F7-F9 were not re-injected this round. They are carried from `95636bfd0`, where they were
killed: the fix changed neither their source sites nor their killing specs.

## Fix test review

- **Does the new test exercise the real provides?** Yes. `childUnder` takes `(tabComponent.options ?? tabComponent).provide`
  (`tabDatabaseProvide.spec.ts:32`), which is the component's actual `provide` function, and runs it on a parent
  that has a `tab` in its data. F10-F12 each fail exactly their own case, which shows each provider is checked on
  its own.
- **Would it catch a break in `TabDatabaseMixin` itself?** Yes for both computeds. `:51`
  (`child.connection.database === "b"`) kills M1, where `connection` ignores `tabDatabase()`. `:49`
  (`child.database === "b"`) kills M2. The `null`-tab half (`:55-56`) also covers the fallback branch.
- **What it does not prove (non-blocking):** the spec builds its own `connectionFor` getter on top of the real
  `connectionForTab` (`:24`), so the real store getter (`store/index.ts:222-225`, including `getters.databaseKey`)
  is outside it. M3 shows other specs cover that getter, so this is a layering choice, not a hole. The parent is
  also a stand-in, not a mounted `TabTableProperties`, so the test does not prove that `TableSchema` and the other
  children are actually rendered under the provider. That is template structure, and Vue's provide/inject
  guarantees it once the provide is right.

## Ranked gaps

None blocking.

1. **The provide test uses a stand-in parent and a stubbed store getter (non-blocking).** See the fix test review.
   Every mutant on the wiring path (provide, mixin, getter) is killed by some spec, so this gap only means one
   seam, real tab component to real child, is shown by structure rather than by a mounted test.
2. **Component method tests use hand-built contexts (non-blocking, carried from Round 5 gap 2).** Round 5's
   gap 1, the concrete risk of this gap, is now closed by the provide test.

## Gate

- `yarn vitest:unit <15 spec files> -t "<39 proof names + 2 describes + 3 regression tests>" --reporter=verbose`: 15 files, 53 passed, 0 failed, 11 skipped (none is a proof). Exit 0, at d0892f30f.
- C26 and C27 grep proofs: exit 0, at d0892f30f.
- C18 `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts`: carried from 95636bfd0 (2 passed, exit 0). The fix touches no utility/db code.
- `yarn vitest:unit` (full): 58 files, 2716 passed, 0 failed, 1 todo. Exit 0, at d0892f30f.
- `yarn test:unit` (full legacy Jest): 80 suites, 799 passed, 0 failed. Exit 0, at d0892f30f.
- Faults this round: 8/8 killed (F10, F11, F12, F4, F6, M1, M2, M3). Round 5's other kills are carried.

Gate outcome: every check is proven, both full suites are green, and no injected mutant survives. Round 5's
blocking gap (F10/F11) is closed by `tabDatabaseProvide.spec.ts`. **PASS.**

Non-blocking observations (carried from Round 3, not re-judged):
- Routines failures are only logged.
- A `force` reload can receive older routines that were still in flight.
- `updateDatabaseTableColumns` drops columns when the table is not in `databaseEntities[database]`.
- `queryClients` leaks on query ids that never execute.
- C33/C38 prop forwarding is shown by citation only.
