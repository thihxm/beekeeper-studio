# Sidebar filter across every loaded database verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 78d823d00..d268a7f53
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Scope: proofs re-run in full for C1-C10 at `d268a7f53`; citations refreshed for the files the fix
touched (`VirtualTableList.vue`, `VirtualTableListFilter.spec.ts`, `checks.md`); Coverage rows whose
authority the fix touched recomputed; the unmet `VirtualTableList` Test policy row re-judged; faults
re-injected on the surfaces the fix touched or created. Fix diff: `f81849e8f..d268a7f53`.

## Binding sources

carried from f81849e8f - the fix did not touch the interface (no new copy, no new screen), so step 1
does not re-run.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| no binding source (profile `standard`, plan marks none binding; `Sources` holds only the user request) | n/a | - | - |

## Checks

verified at d268a7f53

Proof run (all ten, one invocation, from `apps/studio/`, each check's `-t` selector verbatim in the
alternation):
`yarn -s vitest:unit tests/vitest/unit/components/VirtualTableListFilter.spec.ts tests/vitest/unit/components/TableListFilterBadge.spec.ts -t "shows matches under collapsed database and schema nodes|hides loaded databases without a match|keeps unloaded database nodes collapsed|shows matches of a database that loads during the filter|restores the user.s expansion when the filter is cleared|badge sums the default and loaded databases|single-database dialects filter as before|keeps the default database when it has no match|hidden entities and hidden schemas do not count as matches|keeps a locked database collapsed even when its entities were loaded" --reporter=verbose`
- exit 0, `Test Files 2 passed (2)`, `Tests 13 passed (13)`, no `↓` line. Every test listed with its own
`✓` line (C3 as 4 lines: idle, loading, error, locked).

C5's recorded selector run alone (`-t "restores the user.s expansion when the filter is cleared"`):
`✓ ... restores the user's expansion when the filter is cleared 90ms`, `Tests 1 passed | 11 skipped (12)`,
exit 0 - the round-1 false green is gone.

Each selector resolves to a test (`rg -n` over both specs): `VirtualTableListFilter.spec.ts:113` C1,
`:131` C2, `:149` C3 (`it.each`, `"keeps unloaded database nodes collapsed (%s)"`), `:165` C4, `:178` C5,
`:199` C7, `:214` C8, `:224` C9, `:239` C10; `TableListFilterBadge.spec.ts:61` C6. Both spec files are
new in `78d823d00..HEAD`; C8-C10 were added in `d268a7f53`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | matches under a collapsed database node (`b`) and a collapsed schema (`audit`) are displayed, filter `use` | batched run, `✓ shows matches under collapsed database and schema nodes`, exit 0 | `apps/studio/tests/vitest/unit/components/VirtualTableListFilter.spec.ts:119` - `expect(databaseItem(vm, "b").expanded).toBe(false)`; `:125` - `expect(shown).toContain("a:user_log")`; `:126` - `expect(shown).toContain("b:users")`. Wording now matches the test (`user_log` / `use`) - round-1 drift closed | PASS |
| C2 | loaded `c` with only `invoices` is not displayed; `b` is | batched run, `✓ hides loaded databases without a match`, exit 0 | `VirtualTableListFilter.spec.ts:140` - `expect(shownDatabases(vm)).toContain("b")`; `:141` - `expect(shownDatabases(vm)).not.toContain("c")` | PASS |
| C3 | idle / loading / error / locked node displayed, collapsed, no children; table-driven over 4 | batched run, 4 `✓ keeps unloaded database nodes collapsed (idle\|loading\|error\|locked)` lines, exit 0 | `VirtualTableListFilter.spec.ts:144-149` - `it.each` over the 4 states; `:160` - `expect(vm.displayItems).toContain(d)`; `:161` - `expect(d.expanded).toBe(false)`; `:162` - `expect(vm.displayItems.filter((i: any) => i.parent === d)).toEqual([])` | PASS |
| C4 | `b` loaded during filter `eve` shows `events` without expanding | batched run, `✓ shows matches of a database that loads during the filter`, exit 0 | `VirtualTableListFilter.spec.ts:174` - `expect(shownTables(vm)).toContain("b:events")`; `:175` - `expect(databaseItem(vm, "b").expanded).toBe(false)` | PASS |
| C5 | clearing the filter restores the stored expansion, including a click made during the filter | batched run and the recorded selector alone, `✓ restores the user's expansion when the filter is cleared`, exit 0 (1 passed, not 0) | `VirtualTableListFilter.spec.ts:186` - `expect(databaseItem(vm, "b").expanded).toBe(false)`; `:187` - `not.toContain("b:users")`; `:195` - `expect(databaseItem(vm, "b").expanded).toBe(true)`; `:196` - `toContain("b:users")` | PASS |
| C6 | badge reads `2 / 5`, and `2 / 4` with one hidden entity in `a` | batched run, `✓ badge sums the default and loaded databases`, exit 0 | `apps/studio/tests/vitest/unit/components/TableListFilterBadge.spec.ts:62` - `expect(badge(mountTableList([]))).toBe("2 / 5")`; `:63` - `expect(badge(mountTableList(["log"]))).toBe("2 / 4")` (file untouched by the fix) | PASS |
| C7 | `multipleDatabases` disabled: no database item, default list filtered only | batched run, `✓ single-database dialects filter as before`, exit 0 | `VirtualTableListFilter.spec.ts:208` - `expect(shownDatabases(vm)).toEqual([])`; `:209` - `toContain("a:users")`; `:210` - `not.toContain("a:orders")` | PASS |
| C8 | filter `zzz`: default `a` still displayed, loaded `b` with no match not | batched run, `✓ keeps the default database when it has no match`, exit 0 | `VirtualTableListFilter.spec.ts:220` - `expect(shownDatabases(vm)).toContain("a")`; `:221` - `expect(shownDatabases(vm)).not.toContain("b")`. Fault 1 killed | PASS |
| C9 | filter `s`: loaded `b` whose only matches are hidden `events` and `reporting.user_stats` (hidden schema) is not displayed, no `b` table displayed | batched run, `✓ hidden entities and hidden schemas do not count as matches`, exit 0 | fixture `VirtualTableListFilter.spec.ts:228-229` (hidden entity and hidden schema records for `b`); `:235` - `expect(shownDatabases(vm)).not.toContain("b")`; `:236` - `expect(shownTables(vm).filter((t: string) => t.startsWith("b:"))).toEqual([])`. Faults 2 and 3 each killed it alone | PASS |
| C10 | filter `use`: locked `b` with entities loaded before the lock is displayed, `expanded` false, no `b` table displayed | batched run, `✓ keeps a locked database collapsed even when its entities were loaded`, exit 0 | `VirtualTableListFilter.spec.ts:249` - `expect(vm.displayItems).toContain(b)`; `:250` - `expect(b.expanded).toBe(false)`; `:251` - `expect(shownTables(vm).filter((t: string) => t.startsWith("b:"))).toEqual([])`. Fault 4 killed | PASS |

## Coverage

Rows recomputed at d268a7f53 from `VirtualTableList.vue` (the authority the fix touched); the rest
carried from f81849e8f, as marked.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| plan Landing doors (0) - carried from f81849e8f | `plan.md` Landing: `None` | none | - |
| database node state while filtering (10) - verified at d268a7f53 | `VirtualTableList.vue:240` (`isDefault`, `locked`, `status`) × `:290-295` `openedByFilter` × `:297-299` `filteredOut` × `hasMatch` from `:258-265` | default with a match C1 (`spec:125`) · default without a match C8 (`spec:220`, fault 1 killed) · loaded non-default with a match C1/C2 (`spec:126`, `:140`) · loaded non-default without a match C2/C8 (`spec:141`, `:221`) · idle C3 · loading C3 · error C3 · locked, never loaded C3 (`spec:148`) · locked, loaded, with a match C10 (`spec:249-251`, fault 4 killed) · **locked, loaded, with no match: none** | locked database whose entities are loaded and none matches the filter: the `!item.locked` term in `filteredOut` (`VirtualTableList.vue:298`) keeps it listed as AC 3 requires, but no proof asserts it - fault 5 (drop the term) survived, all 12 tests passed. C10's fixture always has a match (`users` vs `use`, `spec:241`, `:246`) and C3's locked row is never loaded (`spec:148`). Reachable: `store/index.ts:743-747` keeps the previous default's entities as `loaded`, `:806` refreshes the lock list. `checks.md` Coverage counts this as one member "locked with loaded entities C10" and hides the no-match half |
| entities that count / do not count as a match (4) - verified at d268a7f53 | `VirtualTableList.vue:259` (`table`, `routine`) and `:263` (`item.hidden`, hidden ancestor) | visible table C1 (`spec:125-126`) · hidden entity C9 (`spec:235`, fault 2 killed) · entity under a hidden schema C9 (`spec:235`, fault 3 killed) · **visible routine: none** | a routine as a match: `:259` lets routines mark their database/schema `hasMatch`, new in this feature, but no fixture in the spec holds a routine - `rg -n "routine" VirtualTableListFilter.spec.ts` finds only empty lists (`:42` `routines: []`, `:97`, `:146`, `:147`). Dropping `&& item.type !== "routine"` would pass every proof (not injected - cap reached; read from the fixtures). AC 1 names "every entity", which includes routines |
| node kinds opened by the filter (2) - verified at d268a7f53 | `VirtualTableList.vue:290-295` | database C1 (`spec:126`), C4 (`spec:174`) · schema C1 (`spec:125`) | - |
| filter transitions (3) - carried from f81849e8f | `VirtualTableList.vue` `filtering`, `regenerateOn` (`filterQuery`, `databaseEntities`) - untouched by the fix | empty -> set C1 · set while a database loads C4 · set -> empty C5 | - |
| expansion sources restored on clear (2) - carried from f81849e8f | `VirtualTableList.vue:285` - untouched by the fix | stored before the filter C5 (`spec:186`) · clicked during the filter C5 (`spec:195`) | - |
| badge terms (4) - carried from f81849e8f | `TableList.vue` - untouched by the fix | default filtered C6 · loaded non-default C6 · hidden entities of default excluded C6 · non-loaded excluded C6 (equivalent under store invariants) | - |
| badge display modes (2) - carried from f81849e8f | `TableList.vue` - untouched by the fix | filtered `shown / total` C6 · unfiltered `total` (same computed) | - |
| dialect shape (2) - carried from f81849e8f | `multipleDatabases` computed - untouched by the fix | multiple databases C1 · `multipleDatabases` disabled C7 | - |

Swept rows re-read against the code at d268a7f53 (only `authorization` changed in the fix):

- authorization (C3, C10, locked): `VirtualTableList.vue:240` forces the stored flag of a locked node
  collapsed; `:293` refuses the filter's display-only opening for a locked database (proven, C10, fault 4);
  `:298` keeps a locked loaded database listed when it has no match (present in code, unproven - fault 5).
- failure modes / dependency failure, concurrency, state transitions: carried from f81849e8f.
- `n/a` rows: user-approved policy.

## Test policy rows

`VirtualTableList` row verified at d268a7f53; the other two carried from f81849e8f (`TableList.vue`
untouched by the fix).

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `VirtualTableList.vue` display pass (`:258-265`, `:285`, `:290-295`, `:297-299`) | one at its own layer (mount) - present, C1-C5, C7-C10 | no - one asserted case per decision row is still not met: the locked-loaded-no-match row of `filteredOut` (`:298`, fault 5 survived) and the routine kind of the match marking (`:259`) have no asserted case. The round-1 rows (default without a match, hidden entity, hidden schema, locked with loaded entities and a match) are now asserted |
| Decides, not reached across a boundary | `TableList.vue` badge | one at its own layer (`shallowMount`) - present, C6 | yes - carried from f81849e8f |
| Wiring that decides nothing | `VirtualTableList.vue` `filtering`, `filterQuery` in `regenerateOn`; `TableList.vue` mapState | one proof through the wiring from the user-visible value | yes - carried from f81849e8f |

## Faults injected

verified at d268a7f53. Isolation: no worktree, no stash. Before each fault `git status --porcelain` was
empty; the fault was applied in place to the committed source, the narrowest covering proof
(`yarn -s vitest:unit tests/vitest/unit/components/VirtualTableListFilter.spec.ts --reporter=verbose`,
one file) was run, `git checkout -- apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue`
restored it, and the porcelain was confirmed empty again after every run. Test files never modified.

| Mutation | Location | Killed |
| --- | --- | --- |
| `filteredOut`: drop `!item.isDefault` (default database with no match is hidden) | `VirtualTableList.vue:298` | yes - C8 (`expected [ 'c' ] to include 'a'`); 1 failed, 11 passed |
| match marking: drop `item.hidden \|\|` (hidden entity counts as a match) | `VirtualTableList.vue:263` | yes - C9 (`expected [ 'a', 'b', 'c' ] to not include 'b'`); 1 failed, 11 passed |
| match marking: drop `\|\| ancestors.some((a) => a.hidden)` (entity under a hidden schema counts) | `VirtualTableList.vue:263` | yes - C9 (`expected [ 'a', 'b', 'c' ] to not include 'b'`); 1 failed, 11 passed |
| `openedByFilter`: database returns `true` instead of `!locked` (locked database opens) | `VirtualTableList.vue:293` | yes - C10 (`expected [ 'b:users' ] to deeply equal []`); 1 failed, 11 passed |
| `filteredOut`: drop `!item.locked` (locked loaded database with no match is hidden) | `VirtualTableList.vue:298` | no - survived, all 12 tests passed (exit 0) |

Cap of 5 reached. Not injected: the `routine` term at `VirtualTableList.vue:259` (no fixture holds a
routine, so its removal cannot be detected - recorded as an unproven Coverage member above).

## Gate

Proofs: `yarn -s vitest:unit <both specs> -t "<10 selectors>" --reporter=verbose` - 13 passed, 0 failed,
0 skipped. C5's recorded selector alone - 1 passed, 11 skipped.

`python3 /Users/thiago/.claude/skills/tlc-spec-lean/scripts/validate_verification.py tree-filter-all-databases` - exit 1:

```
  ERROR tree-filter-all-databases: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [tree-filter-all-databases]
```

## Ranked gaps

1. Surviving mutant / unproven member: a locked database whose entities are loaded and none matches the filter - dropping `!item.locked` from `filteredOut` passes every proof, so AC 3 ("locked ... displayed") is unguarded for this case - `apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue:298`; C10's fixture always matches (`apps/studio/tests/vitest/unit/components/VirtualTableListFilter.spec.ts:241`, `:246`). The `checks.md` Coverage row "locked with loaded entities C10" counts it as covered - precision gap in the checks.
2. Unproven member: a routine as a filter match - `VirtualTableList.vue:259` (new in this feature) lets routines open their database/schema and keep a loaded database listed, but no fixture contains a routine (`VirtualTableListFilter.spec.ts:42`, `:97`); AC 1 says "every entity".
