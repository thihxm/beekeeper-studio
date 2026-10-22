# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - When a check says a filter applies per database (or per scope), give the fixture the same entity in two scopes and assert the other scope is unaffected, and pick names that cannot appear as substrings of other fields.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `apps/studio/tests/vitest` · harmful: 0
- features: multi-database-navigation
- evidence: C17/C36 verification round 1 (apps/studio/tests/vitest)
- last seen: 2026-10-16T00:50:20Z

### L-002 - Put a component's display and lock decisions inside the child that renders them and pass raw parent state as props, so a mount test exercises the decision instead of a value hard-coded in the test.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `apps/studio/src/components` · harmful: 0
- features: multi-database-navigation
- evidence: C33/C38 verification round 1 (apps/studio/src/components)
- last seen: 2026-10-16T00:50:21Z

### L-003 - For a display rule combining several guards (default, locked, loaded, has-match), give each guard a fixture where only that guard decides the outcome, including the no-match variant of every state.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/studio/src/components` · harmful: 0
- features: tree-filter-all-databases
- evidence: VirtualTableList.vue:298 filteredOut (rounds 1-2) (apps/studio/src/components)
- last seen: 2026-10-22T03:33:23Z

### L-004 - Keep apostrophes and other shell-sensitive characters out of vitest test names used as -t selectors; through yarn and electron they are lost and the selector silently matches nothing.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `apps/studio/tests/vitest` · harmful: 0
- features: tree-filter-all-databases
- evidence: checks.md C5 proof selector (round 1) (apps/studio/tests/vitest)
- last seen: 2026-10-22T03:33:24Z

### L-005 - When a claim says every entity, include at least one routine in the fixture, not only tables.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `apps/studio/tests/vitest` · harmful: 0
- features: tree-filter-all-databases
- evidence: VirtualTableList.vue:259 routine match (round 2) (apps/studio/tests/vitest)
- last seen: 2026-10-22T03:33:24Z

### L-006 - When a component draws state from a derived value (isOpen = expanded || openedByFilter), assert the derived value or the rendered markup, never only the stored flag.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/studio/tests/vitest` · harmful: 0
- features: multi-connection-tree
- evidence: VirtualTableList.vue:426 openedByFilter vs stored expanded (round 3) (apps/studio/tests/vitest)
- last seen: 2026-10-22T06:54:12Z

### L-007 - For provide/inject wiring, run the real provider's provide above a child built on the real mixin; a test that injects the value itself proves nothing about the provider.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/studio/tests/vitest` · harmful: 0
- features: multi-connection-tree
- evidence: TabTableProperties.vue provide tabConnectionId (round 1) (apps/studio/tests/vitest)
- last seen: 2026-10-22T06:54:12Z

### L-008 - Build store fixtures with every field the real store always sets (e.g. a connection's default database), or a mutant that branches on that field survives.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `apps/studio/tests/vitest` · harmful: 0
- features: multi-connection-tree
- evidence: TableListFilterBadge.spec.ts fixture without database (round 2) (apps/studio/tests/vitest)
- last seen: 2026-10-22T06:54:12Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
