# Sidebar filter across every loaded database checks

Profile: standard
Plan: `.specs/features/tree-filter-all-databases/plan.md`

7 checks in 1 slice · 0 one-way doors · 0 open

Every proof runs from `apps/studio/`. `VU` = `yarn vitest:unit`. The tree proofs mount
`VirtualTableList` with the app's real `filteredTables`, `filteredRoutines` and `schemaTables`
getters and its real `databaseEntities` mutation, so the filter goes through the same code as the
app. Fixtures follow lesson L-001 (candidate): the same entity name lives in two databases, and
names are not substrings of each other except where a check needs it.

## Checks

### S1 - filter results from every loaded database are visible · 3 files · 33 KB · ~8k

**C1** - With filter `use`, `users` of the default database `a` and `users` of the loaded database `b` are both displayed while `b`'s database node is collapsed, and `log` in `a`'s collapsed `audit` schema is displayed with filter `lo` (AC 1) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableListFilter.spec.ts -t "shows matches under collapsed database and schema nodes"`

**C2** - With filter `use`, a loaded database `c` whose only entity is `invoices` is not in `displayItems`, while `b` (which has `users`) is (AC 2) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableListFilter.spec.ts -t "hides loaded databases without a match"`

**C3** - With filter `use`, a database node in each of the 4 states `idle`, `loading`, `error` and locked is in `displayItems`, with `expanded` false and no child item displayed. The test is table-driven over the 4 (AC 3) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableListFilter.spec.ts -t "keeps unloaded database nodes collapsed"`

**C4** - With filter `eve` already set and `b` never expanded, committing `b` as `loaded` with `events` puts `events` (database `b`) in `displayItems` without calling `handleExpand` (AC 4) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableListFilter.spec.ts -t "shows matches of a database that loads during the filter"`

**C5** - After filter `use` is cleared, `b` is collapsed again and its `users` is not displayed; and when `b` was clicked open (`handleExpand`) during the filter, it stays open after the filter is cleared (AC 5) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableListFilter.spec.ts -t "restores the user's expansion when the filter is cleared"`

**C6** - With filter `use`, `a` holding `users`, `orders`, `log` and loaded `b` holding `users`, `events`, plus `c` in `loading`, the `Entities` badge reads `2 / 5`; with one hidden entity in `a` it reads `2 / 4` (AC 6) ✅
Proof: `VU tests/vitest/unit/components/TableListFilterBadge.spec.ts -t "badge sums the default and loaded databases"`

**C7** - Where `disabledFeatures.multipleDatabases` is set, filter `use` displays no database item and displays `users` of the default entity list only (AC 7) ✅
Proof: `VU tests/vitest/unit/components/VirtualTableListFilter.spec.ts -t "single-database dialects filter as before"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| plan Landing doors (0) | none - the plan's Landing is `None` | - |
| database node state while filtering (7) | default C1 · loaded with match C1 · loaded without match C2 · idle C3 · loading C3 · error C3 · locked C3 | - |
| node kinds opened by the filter (2) | database C1 · schema C1 | - |
| filter transitions (3) | empty → set C1 · set while a database loads C4 · set → empty C5 | - |
| expansion sources restored on clear (2) | stored before the filter C5 · clicked during the filter C5 | - |
| badge terms (3) | default database C6 · loaded non-default database C6 · unloaded database excluded C6 | - |
| dialect shape (2) | multiple databases C1 · `multipleDatabases` disabled C7 | - |

- No check claims an IPC payload or a route; the change is renderer-only.

## Test policy

The repo's guidelines say where tests live and which runner to use. They don't say which level
proves which code. These rows apply to this feature only and are not written into the guidelines.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Wiring that decides nothing | one proof that goes through the wiring | exercised once from the user-visible value |

Evidence:

- `VirtualTableList` display pass: decides per node over filter set/unset × node kind (database, schema) × database state (7 members above) → decides; proven at its own layer by mounting it, C1-C5, C7.
- `TableList` badge: sums 3 terms → decides; proven through a `shallowMount` of `TableList`, C6.
- Closest analogue: `tests/vitest/unit/components/VirtualTableList.spec.ts`, the same component proven at the same level.

Cost: 2 spec files, 7 tests.

## Swept

- validation: n/a - matching is `entityFilter` (`sql_tools.ts`), unchanged by this feature
- failure modes: C3 (a database in `error` while filtering)
- idempotency: n/a - the filtered display is recomputed from state; there is no write
- authorization: C3 (a locked database while filtering)
- concurrency: C4 (a load that lands while the filter is set)
- data lifecycle: n/a - nothing is stored
- dependency failure: C3 (`error` state)
- state transitions: C4, C5
- observability: n/a - no logging requirement in the plan

## Handoff

Size from `wc -c` on the files the slice touches, divided by 4:

- S1 = `VirtualTableList.vue` 17 KB + `TableList.vue` 11 KB + two new specs ≈ 5 KB = 33 KB ≈ 8k, **under the 150k budget**
- Mechanism: one builder, no ask (the estimate fits)

- **Boundary:** C1-C7 closed at `cd546929c`
- **Settled mid-build:** the red run reproduced the diagnosis before any change: C1, C2, C4, C5 and C6 failed on today's code, C3 and C7 (the "as today" cases) passed. A hidden entity, or one under a hidden schema, does not open its database or schema while filtering.
- **Abandoned:** none
