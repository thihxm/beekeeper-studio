import { describe, it, expect, vi } from 'vitest'
import { SQLServerClient } from '@/lib/db/clients/sqlserver'
import { MysqlClient } from '@/lib/db/clients/mysql'

const DATABASE = { database: 'master', connected: false, connecting: false, namespace: null } as any
const SERVER = { db: {}, sshTunnel: null, config: { client: 'sqlserver', host: 'localhost', port: 1433 } } as any

describe('listInaccessibleDatabases', () => {
  it('sql server lists names without db access', async () => {
    const client = new SQLServerClient(SERVER, DATABASE)
    const driverExecuteSingle = vi.fn(async () => ({ data: { recordset: [{ name: 'finance' }, { name: 'hr' }] } }))
    ;(client as any).driverExecuteSingle = driverExecuteSingle

    const names = await client.listInaccessibleDatabases()

    expect(driverExecuteSingle.mock.calls[0][0]).toContain('HAS_DBACCESS(name) = 0')
    expect(driverExecuteSingle.mock.calls[0][0]).toContain('sys.databases')
    expect(names).toEqual(['finance', 'hr'])
  })

  it('default is an empty list', async () => {
    const client = new MysqlClient({ db: {}, config: { client: 'mysql' } } as any, DATABASE)
    const driverExecuteSingle = vi.fn()
    ;(client as any).driverExecuteSingle = driverExecuteSingle

    expect(await client.listInaccessibleDatabases()).toEqual([])
    expect(driverExecuteSingle).not.toHaveBeenCalled()
  })
})
