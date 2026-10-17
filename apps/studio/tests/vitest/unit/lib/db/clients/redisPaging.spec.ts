import { describe, it, expect } from 'vitest'
import { RedisClient } from '@/lib/db/clients/redis'

// Pins RedisClient.selectTop paging without a live server. SCAN gives no order guarantee
// between two full scans, so the fake returns the same key set in a different order (and with a
// duplicate, which SCAN is allowed to return) on every scan. Pages taken from consecutive
// selectTop calls must still partition the key set: no overlap, no skipped key.

const KEYS = ['test:string:1', 'test:string:2', 'test:string:3', 'test:list', 'test:hash']

const SCAN_ORDERS = [
  ['test:string:3', 'test:list', 'test:string:1', 'test:hash', 'test:string:2'],
  ['test:hash', 'test:string:3', 'test:string:2', 'test:string:1', 'test:list', 'test:string:3'],
  ['test:string:2', 'test:hash', 'test:list', 'test:string:3', 'test:string:1'],
]

function makeClient() {
  const client = new RedisClient({ config: {} } as any, { database: '0' } as any)
  let scans = 0
  client.scanAll = async () => SCAN_ORDERS[scans++ % SCAN_ORDERS.length]
  client.getKeyInfo = async (key: string) => ({ key } as any)
  return client
}

async function pageKeys(client: RedisClient, offset: number, limit: number) {
  const page = await client.selectTop('keys', offset, limit, [], [])
  return page.result.map((row: any) => row.key)
}

describe('RedisClient.selectTop paging', () => {
  it('returns non-overlapping pages that cover every key when scan order changes', async () => {
    const client = makeClient()
    const pages = [
      await pageKeys(client, 0, 2),
      await pageKeys(client, 2, 2),
      await pageKeys(client, 4, 2),
    ]

    const seen = pages.flat()
    expect(new Set(seen).size).toBe(seen.length)
    expect([...seen].sort()).toEqual([...KEYS].sort())
  })

  it('returns the same page for the same offset regardless of scan order', async () => {
    const client = makeClient()
    const first = await pageKeys(client, 1, 2)
    const second = await pageKeys(client, 1, 2)
    expect(second).toEqual(first)
  })
})
