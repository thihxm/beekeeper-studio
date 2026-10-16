import { describe, it, expect, vi, beforeEach } from "vitest"
import Vue from "vue"
import Vuex from "vuex"
import { DatabaseLabelModule } from "@/store/modules/DatabaseLabelModule"

Vue.use(Vuex)

let send: ReturnType<typeof vi.fn>

function buildStore(usedConfig: any) {
  return new Vuex.Store<any>({
    state: { usedConfig },
    modules: { databaseLabels: DatabaseLabelModule },
  })
}

const SAVED = { id: 3, workspaceId: -1 }

beforeEach(() => {
  send = vi.fn(async (channel: string, args: any) => {
    if (channel === "appdb/databaseLabels/setColor") return { id: 11, ...args.label }
    if (channel === "appdb/databaseLabels/find") return [{ id: 11, connectionId: 3, workspaceId: -1, databaseName: "b", color: "purple" }]
    return undefined
  })
  Vue.prototype.$util = { send }
})

describe("database labels store", () => {
  it("setting a color saves it", async () => {
    const store = buildStore(SAVED)
    await store.dispatch("databaseLabels/setColor", { databaseName: "b", color: "purple" })

    expect(send).toHaveBeenCalledWith("appdb/databaseLabels/setColor", {
      label: { connectionId: 3, workspaceId: -1, databaseName: "b", color: "purple" },
    })
    expect(store.getters["databaseLabels/colorFor"]("b")).toBe("purple")
  })

  it("default removes the color", async () => {
    const store = buildStore(SAVED)
    await store.dispatch("databaseLabels/setColor", { databaseName: "b", color: "purple" })
    send.mockClear()

    await store.dispatch("databaseLabels/setColor", { databaseName: "b", color: "default" })

    expect(send).toHaveBeenCalledWith("appdb/databaseLabels/remove", { obj: expect.objectContaining({ id: 11, databaseName: "b" }) })
    expect(store.getters["databaseLabels/colorFor"]("b")).toBeNull()
  })

  it("unsaved connection keeps colors in the session", async () => {
    const store = buildStore({ id: null, workspaceId: -1 })
    await store.dispatch("databaseLabels/setColor", { databaseName: "b", color: "purple" })

    expect(store.getters["databaseLabels/colorFor"]("b")).toBe("purple")
    expect(send.mock.calls.filter(([channel]) => channel.startsWith("appdb/databaseLabels/"))).toHaveLength(0)
  })

  it("loads labels of the connection", async () => {
    const store = buildStore(SAVED)
    await store.dispatch("databaseLabels/load")

    expect(send).toHaveBeenCalledWith("appdb/databaseLabels/find", { options: { where: { connectionId: 3, workspaceId: -1 } } })
    expect(store.getters["databaseLabels/colorFor"]("b")).toBe("purple")
  })
})
