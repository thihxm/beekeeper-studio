import { describe, it, expect } from "vitest"
import { SearchModule } from "@/store/modules/SearchModule"

function rootState(inaccessibleDatabases: string[] = []) {
  return {
    inaccessibleDatabases,
    database: "a",
    databaseList: ["a", "warehouse"],
    tables: [{ name: "users", schema: "public", entityType: "table" }],
    databaseEntities: {
      warehouse: { status: "loaded", tables: [{ name: "orders", schema: "public", entityType: "table" }], routines: [] },
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

    const otherTables = index.filter((i) => i.type === "table" && i.database === "warehouse")
    expect(otherTables).toHaveLength(1)
    expect(otherTables[0].title).toContain("warehouse")
    expect(otherTables[0].title).toContain("orders")
    // the default database's tables keep their plain title
    expect(index.find((i) => i.type === "table" && !i.database).title).toBe("public.users")

    const databases = index.filter((i) => i.type === "database").map((i) => i.item)
    expect(databases).toEqual(["a", "warehouse"])
  })

  it("locked databases are not indexed", () => {
    const index = (SearchModule.getters as any).database({}, {}, rootState(["warehouse"]))

    const fromWarehouse = index.filter((i) => i.database === "warehouse" || (i.type === "database" && i.item === "warehouse"))
    expect(fromWarehouse).toHaveLength(0)
    expect(index.filter((i) => i.type === "database").map((i) => i.item)).toEqual(["a"])
  })
})
