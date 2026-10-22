import { describe, it, expect } from "vitest"
import { matches, TransportOpenTab } from "@/common/transport/TransportOpenTab"

function tableTab(databaseName: string | null): TransportOpenTab {
  return { tabType: "table", tableName: "users", schemaName: "public", entityType: "table", databaseName } as TransportOpenTab
}

describe("TransportOpenTab", () => {
  it("matches compares databaseName", () => {
    expect(matches(tableTab("a"), tableTab("b"), "a")).toBe(false)
    expect(matches(tableTab("a"), tableTab("a"), "a")).toBe(true)
    // a tab from before the column existed belongs to the default database
    expect(matches(tableTab(null), tableTab("a"), "a")).toBe(true)
    expect(matches(tableTab(null), tableTab("b"), "a")).toBe(false)
  })

  it("target connection distinguishes tabs", () => {
    const tab = (tabType: string, targetConnectionId: number | null) =>
      ({ tabType, tableName: "users", schemaName: "public", entityType: "table", databaseName: "shop", queryId: 5, targetConnectionId }) as TransportOpenTab
    for (const type of ["table", "query"]) {
      expect(matches(tab(type, null), tab(type, 7), "a")).toBe(false)
      expect(matches(tab(type, 7), tab(type, null), "a")).toBe(false)
      expect(matches(tab(type, 7), tab(type, 7), "a")).toBe(true)
    }
  })
})
