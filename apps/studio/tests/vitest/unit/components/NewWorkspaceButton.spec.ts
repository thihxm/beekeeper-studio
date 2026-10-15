import { describe, it, expect } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vuex from "vuex";
import NewWorkspaceButton from "@/components/sidebar/connection/NewWorkspaceButton.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("tooltip", {});
localVue.config.ignoredElements = [/^x-/];

function mountWith(canAccessCloudWorkspaces: boolean) {
  const store = new Vuex.Store({
    getters: {
      canAccessCloudWorkspaces: () => canAccessCloudWorkspaces,
    },
    modules: {
      credentials: {
        namespaced: true,
        state: { credentials: [{ id: 1 }] },
      },
    },
  });
  return mount(NewWorkspaceButton, { localVue, store });
}

describe("NewWorkspaceButton", () => {
  it("cloud menu follows canAccessCloudWorkspaces", () => {
    const blocked = mountWith(false);
    expect(blocked.find("x-menu").exists()).toBe(false);
    blocked.destroy();

    const allowed = mountWith(true);
    expect(allowed.find("x-menu").exists()).toBe(true);
    allowed.destroy();
  });
});
