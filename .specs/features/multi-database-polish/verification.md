# Multi-database polish verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: a872950f2^..36985db8c
**Round**: 3 - full
**Verifier**: independent sub-agent (author != verifier)

All 32 checks are proven at `36985db8c`, and each has a located assertion. All 37 proof names in `checks.md` ran one by one and passed. C1 passed against a real Postgres container. All 5 faults were killed, including the two Round 2 survivors (the modal's `@submit` binding and its mount in `TableList`). Every recomputed Coverage set is fully proven.

The verdict is **FAIL** for one reason: an unmet `Test policy` row.

- Row 1 ("Decides, reached across a boundary") requires two proofs: one at the boundary, and one at the code's own layer.
- `checks.md` puts `SQLServerClient.listInaccessibleDatabases` in that row, but proves it only at its own layer (C2).
- The stated reason, "no container in the suite", holds only for the Vitest integration tree. The repo already starts a SQL Server testcontainer in `apps/studio/tests/integration/lib/db/clients/sqlserver.spec.ts`.

Either a boundary proof or an explicit amendment of the row by the user closes this.

This is a full round under `standard`, so nothing is carried forward. Every section below is verified at 36985db8c. Range note: the sibling feature's commits in the range (`95636bfd0`, `d0892f30f`, `3e8f64a97`) are out of scope.

## Proof run (verified at 36985db8c)

All commands ran from `apps/studio/` in the main checkout, on a clean tree.

- **Batched VU, one invocation:** `yarn vitest:unit` with the 13 proof spec files, `-t "<the 37 distinct proof names from checks.md, verbatim, as one alternation>"` and `--reporter=verbose`.
  - Result: exit 0. **13 files, 37 passed, 14 skipped.**
  - Each of the 37 names has its own `✓` line. Two names are shared: `database label bar shows its color` serves C15 and C16, and `the utility lists inaccessible databases from the active client` is C7's second proof.
  - The 14 skipped tests are the files' non-proof tests.
- **C1:** `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists databases the role cannot connect to" --reporter=verbose`.
  - Result: exit 0, `✓ ... lists databases the role cannot connect to`.
  - The run took 1 passed and 1 skipped. The skipped test is the sibling feature's.
  - It ran against a real Postgres container (Docker).
- **C14 grep (verbatim):** exit 0.
  - `src/migration/20261016_create_database_labels.js:16` holds the index.
  - `src/migration/index.js:101` holds the import. I also read the run list: `createDatabaseLabels` is in the exported array.
- **C24 grep (verbatim):** exit 0.
  - `default.config.ini:84` reads `revealActiveEntity = true`, under `[ui.tableList]`.
  - `bksConfig.d.ts` has a count of 1, at `src/typings/bksConfig.d.ts:590`.
- **Full `yarn vitest:unit`:** exit 0. **61 files, 2734 passed, 1 todo, 0 failed.**
- **Full legacy Jest `yarn test:unit`:** exit 0. **80 suites, 799 passed, 0 failed.**

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | A role without CONNECT gets a list that contains `secret` and not `a` | VI exit 0. Ran on its own (`✓`) | `apps/studio/tests/vitest/integration/lib/db/multiDatabase.spec.ts:86` - `expect(inaccessible).toContain("secret")`. `:87` - `expect(inaccessible).not.toContain("a")` | PASS |
| C2 | SQL Server SQL contains `HAS_DBACCESS(name) = 0` and returns the names | Batched VU `✓` | `apps/studio/tests/vitest/unit/lib/db/inaccessibleDatabases.spec.ts:16` - `toContain('HAS_DBACCESS(name) = 0')`. `:18` - `expect(names).toEqual(['finance', 'hr'])` | PASS |
| C3 | A client without an override returns `[]` | Batched VU `✓` | `inaccessibleDatabases.spec.ts:26` - `expect(await client.listInaccessibleDatabases()).toEqual([])` | PASS |
| C4 | The 4 driver errors become `DATABASE_ACCESS_DENIED` | Batched VU `✓` | `apps/studio/tests/vitest/unit/handlers/accessDenied.spec.ts:43` - `expect(cases).toHaveLength(4)`, over 42501, errno 1044, number 916, and originalError.info.number 4060. `:49` - `expect(rejected.code).toBe(DATABASE_ACCESS_DENIED)` for each case, plus a fifth `ER_DBACCESS_DENIED_ERROR` case | PASS |
| C5 | A 28P01 error is rethrown as the same object | Batched VU `✓` | `accessDenied.spec.ts:60` - `expect(rejected).toBe(error)`. `:61` - `expect(rejected.code).toBe("28P01")` | PASS |
| C6 | The utility's `errorCode` becomes `err.code` | Batched VU `✓` | `apps/studio/tests/vitest/unit/lib/utility/UtilityConnection.spec.ts:20` - `toBeInstanceOf(Error)`. `:22` - `expect(rejected.code).toBe("DATABASE_ACCESS_DENIED")` | PASS |
| C7 | The list gives `["secret"]`. On a reject it gives `[]`, and the database list is still committed | Batched VU `✓` (2 proofs) | `apps/studio/tests/vitest/unit/store/databaseEntities.spec.ts:130` - `toEqual(["secret"])`. `:138` - `toEqual([])`. `:139` - `databaseList).toEqual(["a", "b", "c"])`. Utility route: `accessDenied.spec.ts:68` - `ConnHandlers["conn/listInaccessibleDatabases"]({ sId: SID })).toEqual(["secret"])` | PASS |
| C8 | Access denied on load locks `b` | Batched VU `✓` | `databaseEntities.spec.ts:152` - `expect(store.state.inaccessibleDatabases).toContain("b")` | PASS |
| C9 | Class, icon, aria-disabled and tabindex are set, and nothing loads | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/VirtualTableList.spec.ts:211` - `classes()).toContain("locked")`. `:212` - `.lock-icon` exists. `:213` - `aria-disabled` is `"true"`. `:214` - `tabindex` is `"0"`. `:218` - `loadDatabaseEntities).toHaveBeenCalledTimes(0)` | PASS |
| C10 | Tooltip text with and without a username, trigger `hover focus` | Batched VU `✓` | `VirtualTableList.spec.ts:230` - `__tooltip).toEqual({...` with `:232` `trigger: "hover focus"`. `:239` - `__tooltip.content).toBe("No permission to access database b with the current account")` | PASS |
| C11 | After a clear, `inaccessibleDatabases` is `[]` | Batched VU `✓` | `databaseEntities.spec.ts:77` - `expect(store.state.inaccessibleDatabases).toEqual([])` | PASS |
| C12 | A locked database has 0 index items | Batched VU `✓` | `apps/studio/tests/vitest/unit/store/SearchModule.spec.ts:39` - `expect(fromWarehouse).toHaveLength(0)`. `:40` - database items `toEqual(["a"])` | PASS |
| C13 | A tab on locked `b` shows the message and no table slot | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/TabWithTable.spec.ts:58` - `toContain("No permission to access database b with the current account")`. `:59` - `.table-slot` exists is `false` | PASS |
| C14 | Unique index, and 2 saves through the handler leave 1 row holding the second color | grep exit 0, batched VU `✓` | `apps/studio/src/migration/20261016_create_database_labels.js:16` - `CREATE UNIQUE INDEX database_labels_connection_database ...`. `apps/studio/tests/vitest/unit/common/appdb/databaseLabels.spec.ts:21` - `expect(rows).toHaveLength(1)`. `:22` - `expect(rows[0].color).toBe('purple')`. Both saves go through `AppDbHandlers['appdb/databaseLabels/setColor']` (`:17-18`) | PASS |
| C15 | Choosing purple dispatches the save, and the bar has the purple class | Batched VU `✓` (5 proofs) | `apps/studio/tests/vitest/unit/components/databaseColorFlow.spec.ts:26` - the menu entry triggers `openDatabaseColorModal` with `"b"`. `:66` - a real `form.color-form` `submit`, through `@submit` (the stub keeps BaseModal's contract, `BaseModal.vue:16`). `:69` - `setColor.mock.calls[0][1]).toEqual({ databaseName: "b", color: "purple" })`. `:104` - `TableList` mounts `DatabaseColorModal`. `apps/studio/tests/vitest/unit/store/databaseLabels.spec.ts:33` - `send` called with `appdb/databaseLabels/setColor`. `VirtualTableList.spec.ts:248` - `toContain("connection-label-color-purple")` | PASS |
| C16 | Choosing default sends remove, and the bar has no color class | Batched VU `✓` (3 proofs) | `databaseColorFlow.spec.ts:79` - a submit with `default` dispatches `{ databaseName: "b", color: "default" }`. `databaseLabels.spec.ts:46` - `send` called with `appdb/databaseLabels/remove` and `{ id: 11, databaseName: "b" }`. `:47` - `colorFor("b")).toBeNull()`. `VirtualTableList.spec.ts:249` - the `connection-label-color-` classes are `[]` | PASS |
| C17 | Stripe and badge are purple on `b` and green on the default | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/CoreTabHeader.spec.ts:40-41` - `.tab-color-stripe` and `.tab-database` have `connection-label-color-purple`. `:44-45` - `connection-label-color-green` on the default | PASS |
| C18 | An unsaved connection updates the store and sends 0 label requests | Batched VU `✓` | `databaseLabels.spec.ts:54` - `toBe("purple")`. `:55` - `send.mock.calls.filter(... "appdb/databaseLabels/")).toHaveLength(0)` | PASS |
| C19 | `load` sends find with `where {connectionId:3, workspaceId:-1}`, and the connect watcher calls it | Batched VU `✓` (2 proofs) | `databaseLabels.spec.ts:62` - `toHaveBeenCalledWith("appdb/databaseLabels/find", { options: { where: { connectionId: 3, workspaceId: -1 } } })`. `:63` - stored. `databaseColorFlow.spec.ts:114` - `dispatch).toHaveBeenCalledWith("databaseLabels/load")` from the `CoreInterface` `usedConfig` watcher | PASS |
| C20 | Keys `b::table.public.users` and `table.public.users`, and the header commits the key | Batched VU `✓` | `apps/studio/tests/vitest/unit/components/revealActiveEntity.spec.ts:73` - `toBe("b::table.public.users")`. `:74` - `toBe("table.public.users")`. `:84` - `commit).toHaveBeenCalledWith("selectSidebarItem", "b::table.public.users")`. `:85` - triggers `AppEvent.revealSidebarItem` | PASS |
| C21 | The view key is `view.public.v` | Batched VU `✓` | `revealActiveEntity.spec.ts:90` - `toBe("view.public.v")` | PASS |
| C22 | With reveal on, selecting expands `b` and its schema, loads `b`, and scrolls to the index | Batched VU `✓` | `revealActiveEntity.spec.ts:101` - emits `AppEvent.revealSidebarItem`. `:102` - `b().expanded).toBe(true)`. `:104` - load `{ database: "b", force: false }`. `:112` - `target.parent.expanded).toBe(true)`. `:115` - `scrollToIndex).toHaveBeenCalledWith(index)` | PASS |
| C23 | With reveal off, nothing expands and nothing scrolls | Batched VU `✓` | `revealActiveEntity.spec.ts:126` - expansion `toEqual(before)`. `:127` - `scrollToIndex).toHaveBeenCalledTimes(0)` | PASS |
| C24 | The ini declares `revealActiveEntity = true`, and it is typed | grep exit 0 | `apps/studio/default.config.ini:84` - `revealActiveEntity = true` under `[ui.tableList]`. `apps/studio/src/typings/bksConfig.d.ts:590` - `revealActiveEntity: boolean;` | PASS |
| C25 | 3 entries with all 3 fields each | Batched VU `✓` | `apps/studio/tests/vitest/unit/services/pluginDatabases.spec.ts:48` - `expect(service.getDatabases()).toEqual([...])`, the full literal for a/b/c (`:48-52`) | PASS |
| C26 | With `multipleDatabases` disabled, the result is `[]` | Batched VU `✓` | `pluginDatabases.spec.ts:57` - `toEqual([])` | PASS |
| C27 | `database: "b"` is sent, and omitting it sends no key | Batched VU `✓` | `pluginDatabases.spec.ts:70` - `toMatchObject({ queryText: "select 1", database: "b" })`. `:75` - `not.toHaveProperty("database")` | PASS |
| C28 | A query tab gives `b`, or the default `a`. A table tab resolves `b`'s orders | Batched VU `✓` | `pluginDatabases.spec.ts:93` - `{ databaseName: "b" }`. `:94` - `{ databaseName: "a" }`. `:97` - `table.databaseName).toBe("b")`. `:98` - `data.table).toBe(ordersB)` | PASS |
| C29 | Connection info keeps the default `a` | Batched VU `✓` | `pluginDatabases.spec.ts:103` - `getConnectionInfo().databaseName).toBe("a")` | PASS |
| C30 | The bridge routes `getDatabases` and the `runQuery` database | Batched VU `✓` | `pluginDatabases.spec.ts:119` - `getDatabases).toHaveBeenCalledTimes(1)`. `:120` - the posted result. `:124` - `runQuery).toHaveBeenCalledWith("select 1", "b")` | PASS |
| C31 | Disconnected gives the noDatabase message | Batched VU `✓` | `pluginDatabases.spec.ts:62` - `toThrow("No database connection found")` | PASS |
| C32 | A locked database gives code `DATABASE_ACCESS_DENIED` | Batched VU `✓` | `pluginDatabases.spec.ts:87` - `expect(rejected.code).toBe("DATABASE_ACCESS_DENIED")` | PASS |

## Coverage

Each set was recomputed from its authority, not read back from `checks.md`. After the author's 14 rows, I swept `plan.md` Landing, Relations, Surface (including all 3 plugin items and their outcomes) and Impact, the Test policy evidence, and the claims. That sweep found 4 sets with no row. They are marked *(new)* below. All of them are proven.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Landing doors (5) | `plan.md` Landing | door 1 C14 (migration grep + handler) · door 2 C1 (Postgres), C2 (SQL Server), C7 (IPC route) · door 3 C4 · door 4 C24 · door 5 C25, C27, C28, C30 | - |
| Relations constraint (1) | `plan.md` Relations, unique (`connectionId`, `workspaceId`, `databaseName`) | C14: one row after 2 saves (`databaseLabels.spec.ts:21`), and the migration index (`20261016_create_database_labels.js:16`) | - |
| driver access-denied codes (5) | `plan.md` door 3 (42501, errno 1044, `ER_DBACCESS_DENIED_ERROR`, 916, 4060) against `src/lib/db/accessDenied.ts:7` (the same 5) | C4, table-driven: 4 named cases (`accessDenied.spec.ts:43`) plus the symbolic MariaDB case (`:45`) | - |
| privilege listing per dialect (3) | `plan.md` door 2, and the overrides in code (`postgresql.ts`, `sqlserver.ts`, `BasicDatabaseClient.ts:302` default) | Postgres family C1 · SQL Server C2 · default C3 | - |
| lock sources and branches (3) | `src/store/index.ts` `updateDatabaseList` try/catch, and `loadDatabaseEntities` catch | list succeeds C7 (`databaseEntities.spec.ts:130`) · list fails C7 (`:138-139`) · load denied C8 (`:152`) | - |
| locked node attributes (4 + no-load) | AC 9 | class, icon, aria-disabled, tabindex C9 (`VirtualTableList.spec.ts:211-214`) · no load C9 (`:218`) | - |
| tooltip (2 triggers, 2 texts) | AC 10 | `hover focus` C10 (`:232`) · with username (`:230`) · without username (`:239`) | - |
| places a lock shows (4) | `plan.md` Flow, the INA edges (VTL, QS, TWT, PSS) | tree C9 · Quick Search C12 · tab C13 · plugin `accessible` C25 | - |
| color places (4) | `plan.md` Flow, the DL edges (VTL, CTH stripe and badge, PSS) | tree C15/C16 · tab stripe C17 · tab badge C17 · plugin `color` C25 | - |
| `DatabaseLabelModule.setColor` branches (3) | `src/store/modules/DatabaseLabelModule.ts` `setColor` | default→remove C16 · unsaved C18 · saved C15 | - |
| color wiring hops (4) | Test policy evidence (menu entry, modal open, modal submit, modal mount) | menu C15 (`databaseColorFlow.spec.ts:26`) · open (`:61-62`) · submit (`:66-69`, `:77-79`) · mount (`:104`) | - |
| selection key parts (2) | `src/common/sidebarKey.ts` | prefix on and off C20 (`revealActiveEntity.spec.ts:73-74`) · entity type C21 (`:90`) | - |
| reveal config values (2) | AC 22/23 | true C22 · false C23 | - |
| `getDatabases` outcomes (3) | `plan.md` Surface | resolves the list C25 · resolves `[]` C26 · rejects noDatabase C31 | - |
| `runQuery` outcomes (3) | `plan.md` Surface | on the given database C27 (`:70`) · driver error C27 (`pluginDatabases.spec.ts:79`, `rejects.toThrow('relation "nope" does not exist')`) · `DATABASE_ACCESS_DENIED` C32 (`:87`) | - |
| plugin tab serialization (2 tab types × 2 database sources) *(new)* | `plan.md` Surface, third bullet | query with `b` C28 (`:93`) · query with null, which gives the default (`:94`) · table with `b` and its entity (`:97-98`) | - |
| plugin bridge routes (2) *(new)* | `plan.md` door 5, against the `WebPluginLoader.ts` switch | `getDatabases` C30 (`:119`) · `runQuery` database C30 (`:124`) | - |
| error-code transport hops (3) *(new)* | `plan.md` Flow, CF→ERR→UC | handler rethrow C4 · renderer keeps `code` C6 · store consumes it C8 | - |
| startup config: revealActiveEntity (2 assemblies) | read directly | `default.config.ini:84` · `bksConfig.d.ts:590` (C24) | - |
| startup assembly: appdb entity and migration (2) *(new)* | read directly | `src/common/appdb/Connection.ts:39` registers `DatabaseLabel` · `src/migration/index.js` imports (`:101`) and lists `createDatabaseLabels` (C14 grep plus direct read) | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `src/lib/db/accessDenied.ts` + `src/handlers/handlerState.ts` `connectionFor` catch · `src/lib/db/clients/postgresql.ts` · `src/lib/db/clients/sqlserver.ts` · `src/store/modules/DatabaseLabelModule.ts` `setColor` · `src/services/plugin/web/PluginStoreService.ts` | own layer and boundary for each: access-denied C4/C5 + C6 · Postgres C1 (real database) · **SQL Server C2 own layer only, no boundary proof** · labels C15/C16/C18 + appdb C14 · plugin C25-C29 + bridge C30-C32 | no - `sqlserver.ts` has no proof at the database boundary. C2 only checks that the SQL contains `HAS_DBACCESS(name) = 0`, with a stubbed driver. The evidence line excuses it with "no container in the suite", but `apps/studio/tests/integration/lib/db/clients/sqlserver.spec.ts` already starts a SQL Server testcontainer that a Vitest integration spec could reuse. Every other file in this row has both proofs |
| Decides, not reached across a boundary | store `updateDatabaseList`/`loadDatabaseEntities` lock logic · `VirtualTableList.vue` database node · `DatabaseLabel.setColor` · `src/common/sidebarKey.ts` · `SearchModule.ts` · `TabWithTable.vue` · `CoreTabHeader.vue` `tabColor` | one asserted case per decision row: lock 3/3 (C7×2, C8) · node: locked C9/C10, color C15/C16, reveal on/off C22/C23 · label row exists/new C14 · key prefix/type C20/C21 · search C12 · tab C13 · tab color purple/default/none C17 (`CoreTabHeader.spec.ts:40-48`) | yes |
| Wiring that decides nothing | `Item.vue` → `StatelessDatabaseItem` props · `CoreTabHeader` → `revealSidebarItem` · `CoreInterface` → `databaseLabels/load` · `DatabaseColorModal` `@submit` · its mount in `TableList.vue` · the "Set color" menu entry | each exercised once from its trigger: props through the mounted `VirtualTableList` (C9) · the header watcher's trigger (`revealActiveEntity.spec.ts:85`) · the connect watcher (`databaseColorFlow.spec.ts:114`) · a form submit (`:66`) · the `TableList` mount (`:104`) · the menu handler (`:26`). F1 and F2 below show the submit and mount proofs now fail without the wiring | yes |
| Instrumentation | `conn/listInaccessibleDatabases` handler (`connHandlers.ts:420`) · `ElectronUtilityConnectionClient.listInaccessibleDatabases` | none of its own, covered by the consumer | yes - C7 drives the client through `$util.send` (`databaseEntities.spec.ts:126`), and the handler also has its own call (`accessDenied.spec.ts:68`) |

## Faults injected

**Isolation.**

- The worktree was created with `git worktree add --detach /private/tmp/claude-503/verify-polish-r3 36985db8c`.
- It had symlinks to the main checkout's root, `apps/studio` and `apps/ui-kit` `node_modules`, and to `apps/ui-kit/dist`.
- Baseline: the 4 covering spec files passed unmutated (4 files, 18 tests).

**Method.**

- A script applied each fault as one exact-substring replacement, asserting a single match.
- It ran `yarn vitest:unit <narrowest covering spec>` on the whole file, with no `-t`.
- It then ran `git checkout -- <file>` and asserted that the tracked tree was clean.

**Cleanup.**

- The worktree was removed with `git worktree remove --force`, then pruned.
- The main tree's `git status --porcelain` was empty before and after; the two were diffed and are identical.
- The symlink targets are intact.

**Choice.** There are 5 faults, one per distinct assertion surface, and each made a different proof fail:

- the two Round 2 survivors, F1 and F2;
- three surfaces that no earlier round had mutated: the plugin `getDatabases` mapping, the selection-key prefix, and the utility error-code copy.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 drop `@submit="save"` from the modal's `<base-modal>` (the Round 2 F7 survivor) | `apps/studio/src/components/sidebar/core/DatabaseColorModal.vue:4` | yes - `databaseColorFlow.spec.ts` `the color modal saves the picked color for its database` and `the color modal removes the color with default` failed |
| F2 drop `<DatabaseColorModal />` from `TableList` (the Round 2 F8 survivor) | `apps/studio/src/components/sidebar/core/TableList.vue:175` | yes - `databaseColorFlow.spec.ts` `the entity tree mounts the color modal` failed |
| F3 `accessible: !state.inaccessibleDatabases.includes(name)` → without the `!` | `apps/studio/src/services/plugin/web/PluginStoreService.ts:272` | yes - `pluginDatabases.spec.ts` `getDatabases lists every database` failed |
| F4 key prefix condition `database !== defaultDatabase` → `===` | `apps/studio/src/common/sidebarKey.ts:13` | yes - `revealActiveEntity.spec.ts` `selection key includes the tab database` failed |
| F5 `Object.assign(err, { code: errorCode })` → `Object.assign(err, {})` | `apps/studio/src/lib/utility/UtilityConnection.ts:77` | yes - `UtilityConnection.spec.ts` `keeps the error code` failed |

## Ranked gaps

1. **Test policy row 1 is not met for `sqlserver.ts`.** There is no boundary proof for `SQLServerClient.listInaccessibleDatabases`. This affects C2 and door 2.
   - Location: `apps/studio/tests/vitest/unit/lib/db/inaccessibleDatabases.spec.ts:16`. It checks the SQL text against a stubbed driver, so `HAS_DBACCESS` semantics, column naming and the `recordset` shape are never exercised.
   - Fix (a): add a Vitest integration spec on the SQL Server testcontainer already used by `apps/studio/tests/integration/lib/db/clients/sqlserver.spec.ts`. It should create a login without access to one database and assert that the database is listed.
   - Fix (b): the user amends row 1, or the evidence line, to accept an own-layer-only proof for SQL Server.

Non-blocking observations:

- **The tab-close path still builds the old selection key.** `apps/studio/src/components/CoreTabs.vue:1055-1056` builds `${tabType}.${schemaName}.${tableName}` to decide whether closing a tab clears the selection. The new key comes from `sidebarKeyForTab` and uses the `<db>::` prefix and `entityType`.
  - Closing a tab on a non-default database, on a view, or on `table-properties` therefore no longer clears the selection.
  - This is usually masked, because the next tab's activation commits a new key. It shows after closing the last tab with the keyboard.
  - The plan's Impact row names only `TableListItem` and `StatelessTableListItem` as consumers of the key. `CoreTabs.vue` is not in the diff and no check covers it.
- **Postgres subclasses inherit the privilege query, unproven.** `CockroachClient`, `RedshiftClient` and `GreengageClient` all inherit it. If the query fails on one of them, `updateDatabaseList`'s catch (C7, reject branch) falls back to `[]`, so the failure is safe.
- **One lookup path in `accessDenied.ts` is never asserted.** That path is `error.originalError?.number`, at `accessDenied.ts:16`. The 4060 case uses `originalError.info.number`.
- **The unsaved branch of `DatabaseLabelModule.load` is not asserted.** That branch sets `[]` and sends no request. AC 19 covers only saved connections.
- **Some proofs call handlers directly.** The C19 and C20 wiring proofs call watcher handlers on hand-built contexts, and the C15 menu proof calls the computed menu handler directly. Each still starts at the claim's trigger, and a fault in the handler body was killed in Round 2 (F2 there).
- **C14's entity test does not exercise the migration.** The test ORM uses `synchronize: true` (`tests/lib/TestOrmConnection.ts:8`), so the unique index it exercises is the entity's `@Index`, not the migration's. The migration index is proven by the grep only. That matches the check as written.

## Gate

- `yarn vitest:unit <13 spec files> -t "<37 proof names>" --reporter=verbose`: 13 files, 37 passed, 0 failed, 14 skipped (none is a proof). Exit 0.
- `yarn vitest:integration tests/vitest/integration/lib/db/multiDatabase.spec.ts -t "lists databases the role cannot connect to"`: 1 passed. Exit 0.
- C14 and C24 grep proofs: exit 0.
- `yarn vitest:unit` (full): 61 files, 2734 passed, 1 todo, 0 failed. Exit 0.
- `yarn test:unit` (full legacy Jest): 80 suites, 799 passed, 0 failed. Exit 0.
- Faults: 5 injected, 5 killed.

Gate outcome: 32/32 checks proven, 0 coverage members unproven, 5/5 faults killed, and 1 Test policy row unmet (SQL Server boundary). **FAIL.**
