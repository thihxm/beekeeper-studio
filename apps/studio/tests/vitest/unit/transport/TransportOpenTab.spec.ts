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
})
