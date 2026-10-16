import { describe, it, expect } from "vitest"
import { SearchModule } from "@/store/modules/SearchModule"

function rootState() {
  return {
    database: "a",
    databaseList: ["a", "b"],
    tables: [{ name: "users", schema: "public", entityType: "table" }],
    databaseEntities: {
      b: { status: "loaded", tables: [{ name: "orders", schema: "public", entityType: "table" }], routines: [] },
    },
    "data/queryFolders": { items: [] },
    "data/queries": { items: [] },
    "data/connectionFolders": { items: [] },
    "data/connections": { items: [] },
  }
}

describe("search/database", () => {
  it("indexes loaded databases and every database name", () => {
    const index = (SearchModule.getters as any).database({}, {}, rootState())

    const otherTables = index.filter((i) => i.type === "table" && i.database === "b")
    expect(otherTables).toHaveLength(1)
    expect(otherTables[0].title).toContain("b")
    expect(otherTables[0].title).toContain("orders")

    const databases = index.filter((i) => i.type === "database").map((i) => i.item)
    expect(databases).toEqual(["a", "b"])
  })
})
