import { Module } from "vuex";
import Vue from "vue";
import { State as RootState } from "../index";
import { TransportDatabaseLabel } from "@/common/transport/TransportDatabaseLabel";

interface State {
  labels: TransportDatabaseLabel[]
}

/** Colors of the databases of the current connection */
export const DatabaseLabelModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    labels: [],
  }),
  getters: {
    /** the color of a database, or null; `default` means none */
    colorFor(state) {
      return (databaseName: string | null): string | null =>
        state.labels.find((l) => l.databaseName === databaseName)?.color ?? null
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
    async setColor(context, { databaseName, color }: { databaseName: string, color: string }) {
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
