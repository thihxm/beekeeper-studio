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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
