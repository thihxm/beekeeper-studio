import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { OpenTab } from '@/common/appdb/models/OpenTab'
import { realMigrations } from '@/migration/index'

describe('tabs bound to a target connection', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('migration adds a nullable target connection to tabs', async () => {
    const migration = realMigrations.find((m) => m.name === '20261021_add_tab_target_connection_id')
    expect(migration).toBeDefined()

    // an app database from before this feature: tabs without the column
    const runner = TestOrmConnection.connection.connection.createQueryRunner()
    try {
      await runner.query('ALTER TABLE tabs DROP COLUMN "targetConnectionId"')
      await migration.run(runner)
    } finally {
      await runner.release()
    }

    const bound = await new OpenTab().withProps({ tabType: 'query', title: 'q1', connectionId: 3, position: 1, targetConnectionId: 7 } as any).save()
    const plain = await new OpenTab().withProps({ tabType: 'query', title: 'q2', connectionId: 3, position: 2 } as any).save()

    expect((await OpenTab.findOneBy({ id: bound.id })).targetConnectionId).toBe(7)
    expect((await OpenTab.findOneBy({ id: plain.id })).targetConnectionId).toBeNull()
  })

  it('app database tab matching compares the target connection', () => {
    const tab = (targetConnectionId: number | null) => new OpenTab().withProps({ tabType: 'table', tableName: 'users', schemaName: 'public', entityType: 'table', databaseName: 'shop', targetConnectionId } as any)
    expect(tab(null).matches(tab(7), 'a')).toBe(false)
    expect(tab(7).matches(tab(null), 'a')).toBe(false)
    expect(tab(7).matches(tab(7), 'a')).toBe(true)
  })
})
