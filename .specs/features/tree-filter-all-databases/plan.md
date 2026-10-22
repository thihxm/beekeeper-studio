# Sidebar filter across every loaded database

> tlc-spec-lean · feature `tree-filter-all-databases` · profile `standard` (the level the user
> set for `multi-database-polish` on 2026-10-16; no AGENTS.md declaration).
> Split from `multi-connection-tree` on purpose: it fixes the database tree that already shipped,
> touches two components, has no one-way door, and can be built, verified and reviewed alone.
> It lands first on the branch so the connection tree builds on a filter that already works.

## Problem

On a connection with several databases, the sidebar's "Filter" input only produces visible
results in the default database. The text is applied to the entities of every loaded database
(`VirtualTableList.vue:249-250`), but:

- a non-default database node keeps the expansion the user left it in, so its matches stay
  hidden under a collapsed node (`VirtualTableList.vue:238`), and so do matches under a collapsed
  schema of any database (`VirtualTableList.vue:171`);
- a loaded database with no match still shows as an empty-looking node, so the list does not
  say where the matches are;
- the `shown / total` badge counts only the default database
  (`TableList.vue:236-243`, from the root `filteredTables` / `filteredRoutines` getters).

The user reads that as "the filter only searches the default database". Anyone who loaded a
second database to find a table has to expand every node by hand to see whether it matched.
The user reported it with the multi-connection request (2026-10-21) and gave no figures.
The code reading above is the diagnosis; Build reproduces it in a mount test before changing
anything.

Once this ships, typing in the filter shows every match of every loaded database, with its
database and schema nodes opened, hides loaded databases with no match, counts all of them in
the badge, and gives back the user's own expansion when the filter is cleared.

## Flow

This reuses `entityFilter` (`sql_tools.ts`), the `databaseEntities` record and the item model
of `VirtualTableList`; nothing is added to the store.

1. The user types → `TableList` (exists) → store `setFilterQuery` (exists, debounced 500 ms) → `entityFilter.filterQuery`
2. `VirtualTableList` (exists) regenerates items: entities of the default database and of every loaded database go through `entityFilter` (exists). While the query is non-empty, the display pass (exists, `generateDisplayItems`) shows database and schema nodes with a match open and skips loaded databases with none, leaving the stored per-node flag as the user set it
3. `TableList` (exists) counts shown and total entities over the default database plus every `databaseEntities` entry with status `loaded`
4. Clearing the query makes `VirtualTableList` (exists) display the stored per-node flags only, which are the user's

## Impact

| Front | What changes |
| --- | --- |
| behaviour | While the filter is non-empty, matches are shown regardless of node expansion. Expanding or collapsing a node during a filter still works and is what the tree shows after the filter is cleared. |
| behaviour | The `Entities` badge totals include loaded non-default databases. The hidden-entity count next to it is unchanged (default database only). |
| domain | Nothing new. `tables` and `databaseEntities` keep their meaning. |
| stored data | Nothing. |

## Relations

None - no stored-data shape change.

## Surface

None - nothing consumed outside. Both components are renderer-only.

## Landing

None - the filtered display is derived on each render and the badge is a computed value; a
refactor reverses both.

- Nothing in this change is hard to reverse

## Criteria

### S1: Filter results from every loaded database are visible (P1)

The filter shows every match in every loaded database without manual expanding.

**Acceptance Criteria**

1. WHILE the filter query is non-empty, the tree SHALL display every entity of every loaded database (the default one and each `databaseEntities` entry with status `loaded`) whose name matches the query, even when its database node or schema node was collapsed
2. WHILE the filter query is non-empty, the tree SHALL NOT display a loaded non-default database node with zero matching entities
3. WHILE the filter query is non-empty, the tree SHALL display a non-default database node whose status is `idle`, `loading`, `error` or locked, collapsed and without children
4. WHEN a non-default database finishes loading while the filter query is non-empty THEN its matching entities SHALL be displayed under it without the user expanding it
5. WHEN the filter query becomes empty THEN every database and schema node SHALL show the expansion it had before the query was typed, including changes the user made by clicking a node while the filter was active
6. WHILE the filter query is non-empty, the `Entities` badge SHALL show `<shown> / <total>`, where both numbers sum the default database and every loaded non-default database, and `<total>` excludes hidden entities of the default database as today
7. WHERE the dialect sets `disabledFeatures.multipleDatabases`, the filter SHALL behave as today: one entity list, no database level

**Independent test:** on Postgres with databases `a` (default) and `b`, load `b` and collapse
it, then type `ord`. `b › public › orders` shows without clicking, `a` shows its own matches, a
loaded `c` with no `ord*` entity disappears, the badge counts both databases, and clearing the
filter collapses `b` again.

## Out of scope

| Excluded | Why |
| --- | --- |
| Loading unloaded databases to search them | Opens one pool per database on large servers - the reason `multi-database-navigation` kept loading lazy (its Q2=A). "Active" databases are read as the loaded ones. |
| Searching columns or routine bodies | The filter matches entity names today |
| Filtering the pinned list differently | `PinnedTableList` is unchanged |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Meaning of "bancos ativos" | databases whose entities are loaded in the tree (expanded at least once this session), plus the default | loading every database on each keystroke is the cost the previous feature refused | n |
| Unloaded databases while filtering | stay listed, collapsed, so the user can expand one and see it filtered | hiding them would make them impossible to load while a filter is typed | n |
| Expansion during a filter | display-only; the stored flag changes only when the user clicks | the user gets their tree back on clear | n |

**Open questions:** none blocking. The meaning of "ativos" is the assumption above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen sidebar tree | empty state (no loaded database matches) | AC 2, 3 - only unloaded nodes remain; with a single database the existing empty list styling applies |
| screen sidebar tree | loading state | AC 3, 4 - existing loading indicator on the node, matches appear when it loads |
| screen sidebar tree | error state | AC 3 - existing error + Retry on the node |
| screen sidebar tree | ordering | existing - `databaseList` order, schemas as today |
| screen sidebar tree | density | AC 1, 2 |
| screen sidebar tree | destructive action confirms | n/a - no destructive action |
| screen entities badge | counts | AC 6 |
| UI copy | neutral tone (CLAUDE.md) | n/a - no new copy |

## Sources

- User request (2026-10-21): "possibilitar a busca no filtro de pesquisa de todos os bancos ativos da conexão atual, hoje ele só filtra no banco default da conexão ativa".
