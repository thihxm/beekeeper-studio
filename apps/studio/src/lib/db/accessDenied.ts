/** Error code for "the current account can't open this database" */
export const DATABASE_ACCESS_DENIED = 'DATABASE_ACCESS_DENIED';

// Driver codes for a missing permission on the database itself:
// Postgres SQLSTATE 42501 (no CONNECT), MySQL/MariaDB 1044 (ER_DBACCESS_DENIED_ERROR),
// SQL Server 916 (no access under the current security context) and 4060 (cannot open database).
const ACCESS_DENIED_CODES: Array<string | number> = ['42501', 1044, 'ER_DBACCESS_DENIED_ERROR', 916, 4060];

export function isDatabaseAccessDenied(error: any): boolean {
  if (!error) return false;
  const candidates = [
    error.code,
    error.errno,
    error.number,
    error.originalError?.number,
    error.originalError?.info?.number,
  ];
  return candidates.some((candidate) => candidate != null && ACCESS_DENIED_CODES.includes(candidate));
}

/** The same message, with `code` set to DATABASE_ACCESS_DENIED */
export function databaseAccessDeniedError(error: any): Error & { code: string } {
  const result = new Error(error?.message ?? String(error)) as Error & { code: string };
  result.code = DATABASE_ACCESS_DENIED;
  return result;
}
