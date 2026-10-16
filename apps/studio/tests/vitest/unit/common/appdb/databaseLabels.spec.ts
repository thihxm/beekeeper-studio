import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { DatabaseLabel } from '@/common/appdb/models/DatabaseLabel'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

describe('database labels', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('one row per connection workspace and database', async () => {
    const label = { connectionId: 1, workspaceId: -1, databaseName: 'b' }
    await AppDbHandlers['appdb/databaseLabels/setColor']({ label: { ...label, color: 'red' } })
    const saved = await AppDbHandlers['appdb/databaseLabels/setColor']({ label: { ...label, color: 'purple' } })

    const rows = await DatabaseLabel.findBy(label)
    expect(rows).toHaveLength(1)
    expect(rows[0].color).toBe('purple')
    expect(saved.color).toBe('purple')

    // the unique index refuses a second row for the same database
    const duplicate = new DatabaseLabel().withProps({ ...label, color: 'green' })
    await expect(duplicate.save()).rejects.toThrow(/UNIQUE/i)

    // another database or workspace is its own row
    await AppDbHandlers['appdb/databaseLabels/setColor']({ label: { ...label, databaseName: 'c', color: 'blue' } })
    await AppDbHandlers['appdb/databaseLabels/setColor']({ label: { ...label, workspaceId: 7, color: 'blue' } })
    expect(await DatabaseLabel.count()).toBe(3)
  })
})
