# Sidebar filter across every loaded database verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 78d823d00..f81849e8f
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| no binding source (profile `standard`, plan marks none binding; `Sources` holds only the user request) | n/a | - | - |

Step 5 (walk with the user) does not apply: no binding design source and no `ui` profile; the behaviour is settled by the checks.

## Checks

Proof run (all seven, one invocation, from `apps/studio/` at `f81849e8f`):
`yarn -s vitest:unit tests/vitest/unit/components/VirtualTableListFilter.spec.ts tests/vitest/unit/components/TableListFilterBadge.spec.ts -t "shows matches under collapsed database and schema nodes|hides loaded databases without a match|keeps unloaded database nodes collapsed|shows matches of a database that loads during the filter|restores the user.s expansion when the filter is cleared|badge sums the default and loaded databases|single-database dialects filter as before" --reporter=verbose` - exit 0, `Tests 10 passed (10)`, each test listed with a `✓` line (C3 as 4 lines: idle, loading, error, locked).

The C5 proof as recorded in `checks.md` (`-t "restores the user's expansion when the filter is cleared"`) runs **zero** tests: the verbose output marks all 9 tests of the file `↓` skipped, `Test Files 1 skipped (1)`, and the command exits 0. The apostrophe does not survive the `vitest:unit` -> `test:unit` -> `yarn electron` hop, so the filter matches nothing and the runner passes with no test behind it. With `user.s` in place of `user's` the same test runs and passes (`✓ ... restores the user's expansion when the filter is cleared 71ms`, `Tests 1 passed | 8 skipped`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | matches under a collapsed database node (`b`) and a collapsed schema (`audit`) are displayed | batched run above, `✓ shows matches under collapsed database and schema nodes`, exit 0 | `tests/vitest/unit/components/VirtualTableListFilter.spec.ts:117` - `expect(databaseItem(vm, "b").expanded).toBe(false)`; `:123` - `expect(shown).toContain("a:user_log")`; `:124` - `expect(shown).toContain("b:users")`. Drift: the claim names `log` with filter `lo`; the test asserts `user_log` (schema `audit`, collapsed because `defaultSchema` is `public`, `:46`) with filter `use` | PASS |
| C2 | loaded `c` with only `invoices` is not displayed; `b` is | batched run, `✓ hides loaded databases without a match`, exit 0 | `VirtualTableListFilter.spec.ts:138` - `expect(shownDatabases(vm)).toContain("b")`; `:139` - `expect(shownDatabases(vm)).not.toContain("c")` | PASS |
| C3 | idle / loading / error / locked node displayed, collapsed, no children; table-driven over 4 | batched run, 4 `✓ keeps unloaded database nodes collapsed (idle|loading|error|locked)` lines, exit 0 | `VirtualTableListFilter.spec.ts:142-146` - `it.each` over the 4 states; `:158` - `expect(vm.displayItems).toContain(d)`; `:159` - `expect(d.expanded).toBe(false)`; `:160` - `expect(vm.displayItems.filter((i: any) => i.parent === d)).toEqual([])` | PASS |
| C4 | `b` loaded during filter `eve` shows `events` without expanding | batched run, `✓ shows matches of a database that loads during the filter`, exit 0 | `VirtualTableListFilter.spec.ts:172` - `expect(shownTables(vm)).toContain("b:events")`; `:173` - `expect(databaseItem(vm, "b").expanded).toBe(false)` | PASS |
| C5 | clearing the filter restores the stored expansion, including a click made during the filter | as recorded in `checks.md`: 0 tests ran (all `↓`), exit 0 - a false green. Batched run with `user.s`: `✓`, exit 0 | `VirtualTableListFilter.spec.ts:184` - `expect(databaseItem(vm, "b").expanded).toBe(false)`; `:185` - `not.toContain("b:users")`; `:193` - `expect(databaseItem(vm, "b").expanded).toBe(true)`; `:194` - `toContain("b:users")` | FAIL - the recorded proof command selects no test and exits 0; the assertion itself holds |
| C6 | badge reads `2 / 5`, and `2 / 4` with one hidden entity in `a` | batched run, `✓ badge sums the default and loaded databases`, exit 0 | `tests/vitest/unit/components/TableListFilterBadge.spec.ts:62` - `expect(badge(mountTableList([]))).toBe("2 / 5")`; `:63` - `expect(badge(mountTableList(["log"]))).toBe("2 / 4")` | PASS |
| C7 | `multipleDatabases` disabled: no database item, default list filtered only | batched run, `✓ single-database dialects filter as before`, exit 0 | `VirtualTableListFilter.spec.ts:206` - `expect(shownDatabases(vm)).toEqual([])`; `:207` - `toContain("a:users")`; `:208` - `not.toContain("a:orders")` | PASS |

All proofs resolve to tests added in `cd546929c` (both spec files are new in `78d823d00..HEAD`).

## Coverage

Recomputed from the code at `f81849e8f`, not from the table in `checks.md`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| plan Landing doors (0) | `plan.md` Landing: `None` | none | - |
| database node state while filtering (9) | `VirtualTableList.vue:235-240` (fields `isDefault`, `locked`, `status`) × `:295` `filteredOut` × `:291` `openedByFilter` | default with a match C1 (`spec:122`) · loaded non-default with a match C1/C2 (`spec:124`, `:138`) · loaded without a match C2 (`spec:139`) · idle C3 · loading C3 · error C3 · locked, never loaded C3 · **default with no match: none** (fault 4 survived; C4's filter `eve` leaves `a` with no match but nothing asserts `a`) · **locked with status `loaded`: none** | default database with zero matches (`VirtualTableList.vue:295` `!item.isDefault`, no assertion); locked database whose entities are loaded (`openedByFilter`, `VirtualTableList.vue:291`, does not check `locked`, so the filter would display children of a locked node that `:240` forces collapsed; reachable via `store/index.ts:743` + `:806`; C3's locked fixture is never loaded, `spec:146`) |
| what counts as a match (hasMatch, 3) | `VirtualTableList.vue:258-265` | visible entity C1 · **hidden entity: none** · **entity under a hidden schema: none** | hidden-entity and hidden-schema branch `VirtualTableList.vue:263` has no proof: the spec's store holds no hidden record (`VirtualTableListFilter.spec.ts:66` - `hideEntities: { ..., state: { entities: [], schemas: [] } }`); `rg -n "hidden" VirtualTableListFilter.spec.ts` finds only that line. The behaviour is named in the artifact's own prose (`checks.md` Handoff, "Settled mid-build") with no check |
| node kinds opened by the filter (2) | `VirtualTableList.vue:291` | database C1 (`spec:124`), C4 (`spec:172`) · schema C1 (`spec:123`) | - |
| filter transitions (3) | `VirtualTableList.vue:469` `filtering`, `:482` regenerate on `filterQuery`, `:481` on `databaseEntities` | empty -> set C1 · set while a database loads C4 · set -> empty C5 | - |
| expansion sources restored on clear (2) | `VirtualTableList.vue:285` (stored `expanded` OR display-only `openedByFilter`) | stored before the filter C5 (`spec:184`) · clicked during the filter C5 (`spec:193`) | - |
| badge terms (4) | `TableList.vue:237-249` | default filtered C6 (`TableListFilterBadge.spec.ts:62`) · loaded non-default C6 (fault 5 killed) · hidden entities of default excluded C6 (`:63`) · non-loaded excluded C6 - vacuous in the fixture (`c` has `tables: []`, `:28`) but equivalent: the store only ever commits `loading`/`error` with empty lists (`store/index.ts:867`, `:885`). The `name !== this.database` term is likewise equivalent (`store/index.ts:748` drops the new default's entry) | - |
| badge display modes (2) | `TableList.vue:87-97` | filtered `shown / total` C6 · unfiltered `total` reuses the same computed `totalEntities` asserted as `/ 5` in C6 | - |
| dialect shape (2) | `VirtualTableList.vue:472-474` `multipleDatabases` | multiple databases C1 · `multipleDatabases` disabled C7 | - |

Swept rows that resolve to existing, re-read against the code:

- failure modes / dependency failure (C3, `error`): `error` status flows from `store/index.ts:885` into the node at `VirtualTableList.vue:237`, and `filteredOut` (`:295`) only hides `loaded` nodes - present.
- authorization (C3, locked): `VirtualTableList.vue:240` forces a locked node collapsed - present, but only for the stored flag; the filter's display-only opening (`:291`) bypasses it for a locked node with loaded entities (the Coverage gap above).
- concurrency (C4): `databaseEntities` is in `regenerateOn` (`VirtualTableList.vue:481`) - present.
- state transitions (C4, C5): `:285` keeps the stored flag untouched while filtering - present (fault 2 killed).
- `n/a` rows (validation, idempotency, data lifecycle, observability): user-approved policy; `sql_tools.ts` is not in the diff.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `VirtualTableList.vue` display pass (`:258-265`, `:285`, `:291`, `:295`) | one at its own layer (mount) - present, C1-C5, C7 | no - one asserted case per decision row is not met: default-without-match, hidden match, and locked-with-loaded-entities rows have no asserted case (Coverage above) |
| Decides, not reached across a boundary | `TableList.vue` badge (`:237-249`) | one at its own layer (`shallowMount`) - present, C6 | yes - every reachable term asserted; the non-loaded and default-name exclusions are equivalent under store invariants |
| Wiring that decides nothing | `VirtualTableList.vue:469` `filtering`, `:482` `filterQuery` in `regenerateOn`; `TableList.vue:219` mapState of `databaseEntities` / `entityFilter` | one proof through the wiring from the user-visible value | yes - C1 commits the real `filterQuery` mutation (`spec:90-91`) and reads `displayItems`; C6 reads the rendered badge text |

## Faults injected

Isolation: in-place mutation of the committed source with `git status --porcelain` empty before each fault and empty again after `git checkout -- <file>` (verified after every run). Each fault ran the full 7-proof batch in one invocation; test files untouched.

| Mutation | Location | Killed |
| --- | --- | --- |
| `openedByFilter` returns `false` (filter never opens a node) | `VirtualTableList.vue:291` | yes - C1 (`expected [ 'a:users' ] to include 'a:user_log'`), C4, C5 |
| `openedByFilter` writes `item.expanded = true` (filter persists into the stored flag) | `VirtualTableList.vue:291` | yes - C4 and C5 (`expected true to be false`) |
| `filteredOut`: `item.status === "loaded"` -> `!==` | `VirtualTableList.vue:295` | yes - C2 (`expected [ 'a', 'b', 'c' ] to not include 'c'`) and all 4 C3 rows |
| `filteredOut`: drop `!item.isDefault` (default database with no match is hidden) | `VirtualTableList.vue:295` | no - survived, all 10 tests passed |
| `shownEntities` counts other loaded databases unfiltered (`entities.length`) | `TableList.vue:247` | yes - C6 (`expected '3 / 5' to be '2 / 5'`) |

Cap of 5 reached. Not mutated: the hidden-match branch (`VirtualTableList.vue:263`) - unexercised by any fixture (`spec:66`), so its removal cannot be detected; C7 was not made to fail - it guards the pre-existing single-database path and the new code has no dialect branch to mutate.

## Gate

Proofs: `yarn -s vitest:unit <both specs> -t "<7 names, user.s>" --reporter=verbose` - 10 passed, 0 failed. C5's recorded command - 0 ran, 9 skipped, exit 0.

`python3 /Users/thiago/.claude/skills/tlc-spec-lean/scripts/validate_verification.py tree-filter-all-databases` - exit 1:

```
  ERROR tree-filter-all-databases: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [tree-filter-all-databases]
```

## Ranked gaps

1. Surviving mutant / unproven member: default database with zero matches while filtering - no check, no assertion; dropping `!item.isDefault` passes every proof - `apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue:295`. The plan does not decide this case either (AC 2 names only non-default databases; Observable "empty state" reads "only unloaded nodes remain") - precision gap in the checks.
2. C5's recorded proof command is a false green: `-t "restores the user's expansion..."` selects 0 tests and exits 0 under `yarn vitest:unit` - `.specs/features/tree-filter-all-databases/checks.md` C5 Proof line; test at `apps/studio/tests/vitest/unit/components/VirtualTableListFilter.spec.ts:176`.
3. Unproven member named in the artifact's own prose: a hidden entity, or one under a hidden schema, does not open its database/schema - `VirtualTableList.vue:263`; no fixture holds a hidden record (`VirtualTableListFilter.spec.ts:66`).
4. Unproven member: a locked database with loaded entities is opened by the filter (`openedByFilter` ignores `locked`) - `VirtualTableList.vue:291` vs `:240`; C3's locked row is never loaded (`VirtualTableListFilter.spec.ts:146`). Reachable via `store/index.ts:743` + `:806`.
5. Claim/proof drift: C1 names `log` with filter `lo`; the test asserts `user_log` with filter `use` - `VirtualTableListFilter.spec.ts:123`. Same property; the check text should match the proof.
