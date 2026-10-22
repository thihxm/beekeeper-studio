import { ActionContext, Module } from "vuex";
import Vue from "vue";
import { State as RootState } from "../index";
import { TransportDatabaseLabel } from "@/common/transport/TransportDatabaseLabel";

interface State {
  labels: TransportDatabaseLabel[]
  /** colors of the databases of saved connections opened from the tree, by connection id */
  others: Record<number, TransportDatabaseLabel[]>
}

/** the workspace of saved connection `connectionId`, which the tree lists from the window's workspace */
function workspaceOf(context: ActionContext<State, RootState>, connectionId: number): number {
  return context.rootGetters["connectionTree/savedConnection"]?.(connectionId)?.workspaceId ?? context.rootState.workspaceId
}

/** Colors of the databases of the current connection, and of saved connections opened from the tree */
export const DatabaseLabelModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    labels: [],
    others: {},
  }),
  getters: {
    /** the color of a database, or null; `default` means none */
    colorFor(state) {
      return (databaseName: string | null): string | null =>
        state.labels.find((l) => l.databaseName === databaseName)?.color ?? null
    },
    /** `colorFor` on saved connection `connectionId`; the window's connection for null */
    colorOn(state, getters) {
      return (connectionId: number | null, databaseName: string | null): string | null => {
        if (connectionId == null) return getters.colorFor(databaseName)
        return state.others[connectionId]?.find((l) => l.databaseName === databaseName)?.color ?? null
      }
    },
  },
  mutations: {
    set(state, labels: TransportDatabaseLabel[]) {
      state.labels = labels
    },
    put(state, label: TransportDatabaseLabel) {
      state.labels = [...state.labels.filter((l) => l.databaseName !== label.databaseName), label]
    },
    remove(state, databaseName: string) {
      state.labels = state.labels.filter((l) => l.databaseName !== databaseName)
    },
    setOn(state, { connectionId, labels }: { connectionId: number, labels: TransportDatabaseLabel[] }) {
      state.others = { ...state.others, [connectionId]: labels }
    },
  },
  actions: {
    async load(context) {
      const { usedConfig } = context.rootState
      if (!usedConfig?.id) {
        context.commit('set', [])
        return
      }
      const labels = await Vue.prototype.$util.send('appdb/databaseLabels/find', {
        options: { where: { connectionId: usedConfig.id, workspaceId: usedConfig.workspaceId } },
      })
      context.commit('set', labels || [])
    },
    /** Loads the colors of saved connection `connectionId` opened from the tree */
    async loadOn(context, connectionId: number) {
      const workspaceId = workspaceOf(context, connectionId)
      const labels = await Vue.prototype.$util.send('appdb/databaseLabels/find', {
        options: { where: { connectionId, workspaceId } },
      })
      context.commit('setOn', { connectionId, labels: labels || [] })
    },
    /** `connectionId` names a saved connection opened from the tree; the window's connection without it */
    async setColor(context, { databaseName, color, connectionId = null }: { databaseName: string, color: string, connectionId?: number | null }) {
      if (connectionId != null) {
        const labels = context.state.others[connectionId] ?? []
        const existing = labels.find((l) => l.databaseName === databaseName)
        const rest = labels.filter((l) => l.databaseName !== databaseName)
        if (!color || color === 'default') {
          if (existing?.id) await Vue.prototype.$util.send('appdb/databaseLabels/remove', { obj: existing })
          context.commit('setOn', { connectionId, labels: rest })
          return
        }
        const label = await Vue.prototype.$util.send('appdb/databaseLabels/setColor', {
          label: { connectionId, workspaceId: workspaceOf(context, connectionId), databaseName, color },
        })
        context.commit('setOn', { connectionId, labels: [...rest, label] })
        return
      }

      const { usedConfig } = context.rootState
      const existing = context.state.labels.find((l) => l.databaseName === databaseName)
      const saved = !!usedConfig?.id

      if (!color || color === 'default') {
        if (saved && existing?.id) {
          await Vue.prototype.$util.send('appdb/databaseLabels/remove', { obj: existing })
        }
        context.commit('remove', databaseName)
        return
      }

      if (!saved) {
        // an unsaved connection keeps its colors for this session only
        context.commit('put', { databaseName, color, connectionId: null, workspaceId: usedConfig?.workspaceId ?? -1 } as TransportDatabaseLabel)
        return
      }
      const label = await Vue.prototype.$util.send('appdb/databaseLabels/setColor', {
        label: { connectionId: usedConfig.id, workspaceId: usedConfig.workspaceId, databaseName, color },
      })
      context.commit('put', label)
    },
  },
}
