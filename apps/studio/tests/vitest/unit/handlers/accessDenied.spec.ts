import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }))

import { connectionFor, newState, removeState, state } from "@/handlers/handlerState"
import { DATABASE_ACCESS_DENIED } from "@/lib/db/accessDenied"

const SID = "access-denied-window"

function serverFailingWith(error: any) {
  const db: Record<string, any> = {}
  return {
    db: (name: string) => db[name],
    createConnection: vi.fn((name: string) => (db[name] = {
      connect: vi.fn(async () => { throw error }),
      disconnect: vi.fn(async () => undefined),
    })),
    destroyConnection: vi.fn((name: string) => { delete db[name] }),
    end: vi.fn(),
  }
}

function driverError(message: string, props: Record<string, any>) {
  return Object.assign(new Error(message), props)
}

describe("connectionFor access-denied errors", () => {
  beforeEach(() => {
    newState(SID)
    state(SID).connection = { connectionType: "postgresql" } as any
    state(SID).database = "a"
  })
  afterEach(async () => removeState(SID))

  it("driver access-denied errors become DATABASE_ACCESS_DENIED", async () => {
    const cases = [
      driverError('permission denied for database "b"', { code: "42501" }),
      driverError("Access denied for user 'u'@'%' to database 'b'", { errno: 1044, code: "ER_DBACCESS_DENIED_ERROR" }),
      driverError("The server principal is not able to access the database", { number: 916 }),
      driverError('Cannot open database "b" requested by the login', { originalError: { info: { number: 4060 } } }),
    ]
    expect(cases).toHaveLength(4)
    for (const error of cases) {
      state(SID).server = serverFailingWith(error) as any
      const rejected = await connectionFor(SID, "b").then(() => null, (e) => e)
      expect(rejected.code).toBe(DATABASE_ACCESS_DENIED)
      expect(rejected.message).toBe(error.message)
    }
  })

  it("other errors pass through unchanged", async () => {
    const error = driverError('password authentication failed for user "u"', { code: "28P01" })
    state(SID).server = serverFailingWith(error) as any

    const rejected = await connectionFor(SID, "b").then(() => null, (e) => e)

    expect(rejected).toBe(error)
    expect(rejected.code).toBe("28P01")
  })
})
