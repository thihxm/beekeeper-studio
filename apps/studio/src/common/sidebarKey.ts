import { TransportOpenTab } from "@/common/transport/TransportOpenTab";

type KeyedTab = Pick<TransportOpenTab, 'tableName' | 'schemaName' | 'entityType' | 'databaseName' | 'targetConnectionId'>;

/**
 * The sidebar tree key of the entity a tab shows. Entities of a non-default
 * database are prefixed with `<database>::`, and entities of a saved connection
 * opened from the tree with `connection::<id>::<database>::`, like the tree's own keys.
 */
export function sidebarKeyForTab(tab: KeyedTab, defaultDatabase: string | null): string | null {
  if (!tab?.tableName) return null;
  const database = tab.databaseName ?? null;
  const entity = `${tab.entityType || 'table'}.${tab.schemaName ?? null}.${tab.tableName}`;
  if (tab.targetConnectionId != null) return `connection::${tab.targetConnectionId}::${database}::${entity}`;
  const prefix = database != null && database !== defaultDatabase ? `${database}::` : '';
  return `${prefix}${entity}`;
}

/** Closing this tab should clear the sidebar selection: it points at the tab's entity */
export function closedTabWasSelected(
  tab: KeyedTab,
  selectedSidebarItem: string | null,
  defaultDatabase: string | null
): boolean {
  const key = sidebarKeyForTab(tab, defaultDatabase);
  return !!key && key === selectedSidebarItem;
}
