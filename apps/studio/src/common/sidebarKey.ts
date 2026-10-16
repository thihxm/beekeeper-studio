import { TransportOpenTab } from "@/common/transport/TransportOpenTab";

/**
 * The sidebar tree key of the entity a tab shows. Entities of a non-default
 * database are prefixed with `<database>::`, like the tree's own keys.
 */
export function sidebarKeyForTab(
  tab: Pick<TransportOpenTab, 'tableName' | 'schemaName' | 'entityType' | 'databaseName'>,
  defaultDatabase: string | null
): string | null {
  if (!tab?.tableName) return null;
  const database = tab.databaseName ?? null;
  const prefix = database != null && database !== defaultDatabase ? `${database}::` : '';
  return `${prefix}${tab.entityType || 'table'}.${tab.schemaName ?? null}.${tab.tableName}`;
}
