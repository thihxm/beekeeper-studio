# Sidebar filter across every loaded database verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 78d823d00..7c7508eb9
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Scope: proofs re-run in full for C1-C12 at `7c7508eb9`; citations refreshed for the one file the fix
touched (`VirtualTableListFilter.spec.ts`; `checks.md` re-read); the Coverage rows the fix touched
(database node state while filtering, entity kinds that count as a match) recomputed; the unmet
`VirtualTableList` Test policy row re-judged; faults re-injected on the two surfaces round 2 found
unguarded and on the new surface C12 created. Fix diff: `d268a7f53..7c7508eb9` - `checks.md` and
`VirtualTableListFilter.spec.ts` only (+28 lines, two appended tests at `:254-280`; nothing above
`:252` moved). No source file changed: `git diff --stat d268a7f53..HEAD -- apps/studio/src` is empty, so
every `VirtualTableList.vue` / `TableList.vue` line cited below is the same as at `d268a7f53`.

## Binding sources

carried from d268a7f53 - the fix did not touch the interface (test and checks only), so step 1 does
not re-run.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| no binding source (profile `standard`, plan marks none binding; `Sources` holds only the user request) | n/a | - | - |

## Checks

verified at 7c7508eb9

Proof run (all twelve, one invocation, from `apps/studio/`, each check's `-t` selector verbatim in the
alternation):
`yarn -s vitest:unit tests/vitest/unit/components/VirtualTableListFilter.spec.ts tests/vitest/unit/components/TableListFilterBadge.spec.ts -t "shows matches under collapsed database and schema nodes|hides loaded databases without a match|keeps unloaded database nodes collapsed|shows matches of a database that loads during the filter|restores the user.s expansion when the filter is cleared|badge sums the default and loaded databases|single-database dialects filter as before|keeps the default database when it has no match|hidden entities and hidden schemas do not count as matches|keeps a locked database collapsed even when its entities were loaded|keeps a locked database listed when its loaded entities have no match|a matching routine opens its database" --reporter=verbose`
- exit 0, `Test Files 2 passed (2)`, `Tests 15 passed (15)`, no `↓` (skipped) and no `×` line. Every test
listed with its own `✓` line (C3 as 4 lines: idle, loading, error, locked). 15 = 14 tests in
`VirtualTableListFilter.spec.ts` + 1 in `TableListFilterBadge.spec.ts`, i.e. every test in both files,
so no selector matched nothing. No selector carries a `'` (C5 uses `.`, and its `✓ ... restores the
user's expansion when the filter is cleared` line is present).

Each selector resolves to a test (`rg -n "it\(|it\.each|\)\(\""` over both specs):
`VirtualTableListFilter.spec.ts:113` C1, `:131` C2, `:144-149` C3 (`it.each`, `"keeps unloaded database
nodes collapsed (%s)"`), `:165` C4, `:178` C5, `:199` C7, `:214` C8, `:224` C9, `:239` C10, `:254` C11,
`:268` C12; `TableListFilterBadge.spec.ts:61` C6. Both spec files are new in `78d823d00..HEAD`; C11 and
C12 were added in `7c7508eb9`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | matches under a collapsed database node (`b`) and a collapsed schema (`audit`) are displayed, filter `use` | batched run, `✓ shows matches under collapsed database and schema nodes`, exit 0 | `apps/studio/tests/vitest/unit/components/VirtualTableListFilter.spec.ts:119` - `expect(databaseItem(vm, "b").expanded).toBe(false)`; `:125` - `expect(shown).toContain("a:user_log")`; `:126` - `expect(shown).toContain("b:users")` | PASS |
| C2 | loaded `c` with only `invoices` is not displayed; `b` is | batched run, `✓ hides loaded databases without a match`, exit 0 | `VirtualTableListFilter.spec.ts:140` - `expect(shownDatabases(vm)).toContain("b")`; `:141` - `expect(shownDatabases(vm)).not.toContain("c")` | PASS |
| C3 | idle / loading / error / locked node displayed, collapsed, no children; table-driven over 4 | batched run, 4 `✓ keeps unloaded database nodes collapsed (<state>)` lines, one each for idle, loading, error, locked, exit 0 | `VirtualTableListFilter.spec.ts:144-149` - `it.each` over the 4 states; `:160` - `expect(vm.displayItems).toContain(d)`; `:161` - `expect(d.expanded).toBe(false)`; `:162` - `expect(vm.displayItems.filter((i: any) => i.parent === d)).toEqual([])` | PASS |
| C4 | `b` loaded during filter `eve` shows `events` without expanding | batched run, `✓ shows matches of a database that loads during the filter`, exit 0 | `VirtualTableListFilter.spec.ts:174` - `expect(shownTables(vm)).toContain("b:events")`; `:175` - `expect(databaseItem(vm, "b").expanded).toBe(false)` | PASS |
| C5 | clearing the filter restores the stored expansion, including a click made during the filter | batched run, `✓ restores the user's expansion when the filter is cleared`, exit 0 | `VirtualTableListFilter.spec.ts:186` - `expect(databaseItem(vm, "b").expanded).toBe(false)`; `:187` - `not.toContain("b:users")`; `:195` - `expect(databaseItem(vm, "b").expanded).toBe(true)`; `:196` - `toContain("b:users")` | PASS |
| C6 | badge reads `2 / 5`, and `2 / 4` with one hidden entity in `a` | batched run, `✓ badge sums the default and loaded databases`, exit 0 | `apps/studio/tests/vitest/unit/components/TableListFilterBadge.spec.ts:62` - `expect(badge(mountTableList([]))).toBe("2 / 5")`; `:63` - `expect(badge(mountTableList(["log"]))).toBe("2 / 4")` (file untouched by the fix; lines re-read) | PASS |
| C7 | `multipleDatabases` disabled: no database item, default list filtered only | batched run, `✓ single-database dialects filter as before`, exit 0 | `VirtualTableListFilter.spec.ts:208` - `expect(shownDatabases(vm)).toEqual([])`; `:209` - `toContain("a:users")`; `:210` - `not.toContain("a:orders")` | PASS |
| C8 | filter `zzz`: default `a` still displayed, loaded `b` with no match not | batched run, `✓ keeps the default database when it has no match`, exit 0 | `VirtualTableListFilter.spec.ts:220` - `expect(shownDatabases(vm)).toContain("a")`; `:221` - `expect(shownDatabases(vm)).not.toContain("b")` | PASS |
| C9 | filter `s`: loaded `b` whose only matches are hidden `events` and `reporting.user_stats` (hidden schema) is not displayed, no `b` table displayed | batched run, `✓ hidden entities and hidden schemas do not count as matches`, exit 0 | fixture `VirtualTableListFilter.spec.ts:228-229`; `:235` - `expect(shownDatabases(vm)).not.toContain("b")`; `:236` - `expect(shownTables(vm).filter((t: string) => t.startsWith("b:"))).toEqual([])` | PASS |
| C10 | filter `use`: locked `b` with entities loaded before the lock is displayed, `expanded` false, no `b` table displayed | batched run, `✓ keeps a locked database collapsed even when its entities were loaded`, exit 0 | `VirtualTableListFilter.spec.ts:249` - `expect(vm.displayItems).toContain(b)`; `:250` - `expect(b.expanded).toBe(false)`; `:251` - `expect(shownTables(vm).filter((t: string) => t.startsWith("b:"))).toEqual([])` | PASS |
| C11 | filter `use`: locked `b` whose loaded entities (`events`) have no match is still displayed, `expanded` false | batched run, `✓ keeps a locked database listed when its loaded entities have no match`, exit 0 | precondition `VirtualTableListFilter.spec.ts:256-257` - `databaseEntities: { b: loaded(table("events")) }`, `inaccessibleDatabases: ["b"]`; `:264` - `expect(vm.displayItems).toContain(b)`; `:265` - `expect(b.expanded).toBe(false)`. Fault 1 killed it at `:264` | PASS |
| C12 | filter `user_c`: loaded `b` whose only match is the routine `user_count` is displayed, and the displayed routines are exactly `b:user_count` | batched run, `✓ a matching routine opens its database`, exit 0 | precondition `VirtualTableListFilter.spec.ts:269-271` - routine `user_count` plus non-matching table `events` in `b` (default `a` has no `user_c*` entity, `:21`); `:277` - `expect(shownDatabases(vm)).toContain("b")`; `:279` - `expect(routines).toEqual(["b:user_count"])`. Fault 2 killed it at `:277`, fault 3 at `:279` | PASS |

## Coverage

Rows the fix touched recomputed at 7c7508eb9 from `VirtualTableList.vue` (unchanged since d268a7f53);
the rest carried, as marked.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| plan Landing doors (0) - carried from d268a7f53 | `plan.md` Landing: `None` | none | - |
| database node state while filtering (10) - verified at 7c7508eb9 | `VirtualTableList.vue:235-237` (`isDefault`, `locked`, `status`) × `:290-295` `openedByFilter` × `:297-299` `filteredOut` × `hasMatch` from `:258-265` | default with a match C1 (`spec:125`) · default without a match C8 (`spec:220`) · loaded non-default with a match C1/C2 (`spec:126`, `:140`) · loaded non-default without a match C2/C8 (`spec:141`, `:221`) · idle C3 · loading C3 · error C3 · locked, never loaded C3 (`spec:148`, `:160-162`) · locked, loaded, with a match C10 (`spec:249-251`) · locked, loaded, without a match C11 (`spec:264-265`, fault 1 killed). Locked + `loading`/`error` is not a distinct member: `filteredOut` needs `status === "loaded"` and `hasMatch` needs loaded items, so both reduce to the locked-never-loaded branch C3 proves | - |
| entity kinds that count as a match (2) - verified at 7c7508eb9 | `VirtualTableList.vue:259` (`item.type !== "table" && item.type !== "routine"`); views are `type: "table"` items (`group.tables` of `TableOrView`, `:184-187`), same branch | table C1 (`spec:125-126`) · routine C12 (`spec:277`, `:279`; fault 2 killed) | - |
| entities that do not count as a match (2) - carried from d268a7f53 | `VirtualTableList.vue:263` - untouched; spec lines `:228-236` unmoved | hidden entity C9 · entity under a hidden schema C9 | - |
| node kinds opened by the filter (2) - carried from d268a7f53 | `VirtualTableList.vue:290-295` - untouched | database C1 (`spec:126`), C4 (`spec:174`), C12 (`spec:279`, fault 3) · schema C1 (`spec:125`) | - |
| filter transitions (3) - carried from d268a7f53 | `filtering`, `regenerateOn` - untouched | empty -> set C1 · set while a database loads C4 · set -> empty C5 | - |
| expansion sources restored on clear (2) - carried from d268a7f53 | `VirtualTableList.vue:285` - untouched | stored before the filter C5 (`spec:186`) · clicked during the filter C5 (`spec:195`) | - |
| badge terms (4) - carried from d268a7f53 | `TableList.vue` - untouched since f81849e8f | default filtered C6 · loaded non-default C6 · hidden entities of default excluded C6 · non-loaded excluded C6 | - |
| badge display modes (2) - carried from d268a7f53 | `TableList.vue` - untouched | filtered `shown / total` C6 · unfiltered `total` (same computed) | - |
| dialect shape (2) - carried from d268a7f53 | `multipleDatabases` computed - untouched | multiple databases C1 · `multipleDatabases` disabled C7 | - |

`checks.md` Coverage now splits round 2's hidden member ("locked with loaded entities") into C10 and
C11 and adds the "entity kinds that count as a match" row - both match the recompute above.

Swept rows re-read against the code at 7c7508eb9:

- authorization (C3, C10, C11, locked): `VirtualTableList.vue:240` forces a locked node's stored flag
  collapsed; `:293` refuses the filter's opening for a locked database (C10); `:298` `!item.locked` keeps
  a locked loaded database listed with no match - present and now proven (C11, fault 1 killed).
- failure modes / dependency failure, concurrency, state transitions: carried from d268a7f53.
- `n/a` rows: user-approved policy.

## Test policy rows

`VirtualTableList` row verified at 7c7508eb9 (it classifies the touched spec's subject and was unmet in
round 2); the other two carried from d268a7f53.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `VirtualTableList.vue` display pass (`:258-265`, `:285`, `:290-295`, `:297-299`) | one at its own layer (mount) - present, C1-C5, C7-C12 | yes - one asserted case per decision row (enumerated below the table) |
| Decides, not reached across a boundary | `TableList.vue` badge | one at its own layer (`shallowMount`) - present, C6 | yes - carried from d268a7f53 |
| Wiring that decides nothing | `VirtualTableList.vue` `filtering`, `filterQuery` in `regenerateOn`; `TableList.vue` mapState | one proof through the wiring from the user-visible value | yes - carried from d268a7f53 |

Decision rows of the `VirtualTableList.vue` display pass, each with its asserted case: match marking -
table C1, routine C12, hidden entity C9, hidden schema C9; `openedByFilter` - filter cleared C5, database
without a match C2/C8, locked database C10, unlocked database C1/C12, schema C1; `filteredOut` - default
database C8, locked database C11, database not loaded C3, database without a match C2; `isVisible`
opening by the filter C1. Round 2's two unasserted rows (`:298` locked, `:259` routine) are now asserted
by C11 and C12, and each killed its mutant (faults 1 and 2).

## Faults injected

verified at 7c7508eb9. Isolation: no worktree, no stash. Before each fault `git status --porcelain` was
empty; the fault was applied in place to the committed source with `perl -pi`, `git diff` showed the one
changed line, the narrowest covering proof
(`yarn -s vitest:unit tests/vitest/unit/components/VirtualTableListFilter.spec.ts --reporter=verbose`)
was run, `git checkout -- apps/studio/src/components/sidebar/core/table_list/VirtualTableList.vue`
restored it, and the porcelain was confirmed empty again after every run. Test files never modified.
Faults 1 and 2 are round 2's two unguarded surfaces; fault 3 targets C12's second assertion (`:279`),
the new surface fault 2 could not reach because `:277` fails first. Round 2's four killed faults are not
re-run: the source they mutate is unchanged and the tests that killed them are unchanged.

| Mutation | Location | Killed |
| --- | --- | --- |
| `filteredOut`: drop `!item.locked &&` (locked loaded database with no match is hidden) | `VirtualTableList.vue:298` | yes - C11 only (`expected [ { type: 'database', …(16) }, …(5) ] to include { type: 'database', …(15) }`, `spec:264`); 1 failed, 13 passed |
| match marking: `item.type !== "table" && item.type !== "routine"` -> `item.type !== "table"` (a routine is not a match) | `VirtualTableList.vue:259` | yes - C12 only (`expected [ 'a', 'c' ] to include 'b'`, `spec:277`); 1 failed, 13 passed |
| `openedByFilter`: database branch returns `false` instead of `!locked` (listed database never opens) | `VirtualTableList.vue:293` | yes - C12 at `spec:279` (`expected [] to deeply equal [ 'b:user_count' ]`), plus C1 `:126`, C4 `:174`, C5 `:183`; 4 failed, 10 passed |

Fault 1 is the mutant that survived round 2 (all 12 tests passed then); fault 2 could not be detected in
round 2 because no fixture held a routine. Both are now killed by exactly the test added for them.

## Gate

verified at 7c7508eb9

Proofs: `yarn -s vitest:unit <both specs> -t "<12 selectors>" --reporter=verbose` - 15 passed, 0 failed,
0 skipped, exit 0.

`python3 /Users/thiago/.claude/skills/tlc-spec-lean/scripts/validate_verification.py tree-filter-all-databases`:

```
validate_verification: 0 error(s), 0 warning(s) across [tree-filter-all-databases]
```

exit 0.
