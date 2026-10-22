const CHILD_SESSION = '::connection::'

/**
 * The utility session a window opens for another saved connection: that
 * connection runs in its own State (server, database clients, queries) next to
 * the window's.
 */
export function childSessionKey(windowSid: string, savedConnectionId: number | string): string {
  return `${windowSid}${CHILD_SESSION}${savedConnectionId}`
}

/** The window session of a child session key, or null for a window's own key */
export function parentSessionKey(sId: string): string | null {
  const at = sId?.indexOf(CHILD_SESSION) ?? -1
  return at > 0 ? sId.slice(0, at) : null
}

/** Whether `sId` is a child session of `windowSid` */
export function isChildSessionOf(sId: string, windowSid: string): boolean {
  return parentSessionKey(sId) === windowSid
}
