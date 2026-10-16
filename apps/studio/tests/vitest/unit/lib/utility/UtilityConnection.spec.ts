import { describe, it, expect } from "vitest"
import { UtilityConnection } from "@/lib/utility/UtilityConnection"

describe("UtilityConnection", () => {
  it("keeps the error code", async () => {
    const connection = new UtilityConnection()
    const port: any = {
      start: () => undefined,
      postMessage: ({ id }) => {
        // the utility answers with an error that carries a code
        queueMicrotask(() => port.onmessage({
          data: { type: "error", id, error: "permission denied for database b", errorName: "Error", errorCode: "DATABASE_ACCESS_DENIED" },
        }))
      },
    }
    connection.setPort(port, "window-1")

    const rejected = await connection.send("conn/listTables", { database: "b" }).then(() => null, (e) => e)

    expect(rejected).toBeInstanceOf(Error)
    expect(rejected.message).toBe("permission denied for database b")
    expect(rejected.code).toBe("DATABASE_ACCESS_DENIED")
  })
})
