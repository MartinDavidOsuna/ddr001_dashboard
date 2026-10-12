import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import AppLayout from "@/layouts/AppLayout.vue";
import dashboardRouter from "@/router";
import { useAuthStore } from "@/stores/auth";
const Empty = { template: "<div />" };
describe("Canonical/legacy routing and administrative navigation", () => {
  it.each(["admin", "supervisor", "viewer"] as const)(
    "preserves Bases and scopes cabinets for %s in expanded/collapsed sidebar",
    async (role) => {
      const pinia = createPinia();
      const auth = useAuthStore(pinia);
      auth.ready = true;
      auth.user = { userId: "test", role } as NonNullable<typeof auth.user>;
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:pathMatch(.*)*", component: Empty }],
      });
      await router.push("/levantamientos/bases");
      const w = mount(AppLayout, {
        global: { plugins: [pinia, router], stubs: { RouterView: Empty } },
      });
      for (const collapsed of [false, true]) {
        if (collapsed)
          await w.get('button[aria-label="Contraer menú"]').trigger("click");
        await w
          .get('button[aria-label="Levantamientos"]')
          .trigger("keydown", { key: "ArrowDown" });
        expect(w.get('a[href="/levantamientos/bases"]').text()).toBe("Bases");
        expect(
          w.find('a[href="/levantamientos/nuevos-hidrantes"]').exists(),
        ).toBe(role !== "viewer");
        await w.get("aside").trigger("keydown", { key: "Escape" });
        expect(w.find("#nav-surveys").exists()).toBe(false);
      }
      w.unmount();
    },
  );
  it("redirects both legacy paths preserving params/query/hash and ranks static routes correctly", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: dashboardRouter.options.routes,
    });
    await router.push("/levantamientos?search=old#filter");
    expect(router.currentRoute.value.fullPath).toBe(
      "/levantamientos/bases?search=old#filter",
    );
    await router.push("/levantamientos/test-id?page=2");
    expect(router.currentRoute.value.fullPath).toBe(
      "/levantamientos/bases/test-id?page=2",
    );
    expect(router.resolve("/levantamientos/bases").name).toBe(
      "construction-surveys",
    );
    expect(router.resolve("/levantamientos/nuevos-hidrantes").name).toBe(
      "cabinets",
    );
    expect(router.resolve("/levantamientos/nuevos-hidrantes/id").name).toBe(
      "cabinet-detail",
    );
  });
  it("protects direct list and detail navigation for viewer while Bases remains accessible", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore(pinia);
    auth.ready = true;
    auth.user = { userId: "test", role: "viewer" } as NonNullable<
      typeof auth.user
    >;
    await dashboardRouter.push("/levantamientos/nuevos-hidrantes");
    expect(dashboardRouter.currentRoute.value.name).toBe("cabinets-forbidden");
    await dashboardRouter.push(
      "/levantamientos/nuevos-hidrantes/00000000-0000-4000-8000-000000000001",
    );
    expect(dashboardRouter.currentRoute.value.name).toBe("cabinets-forbidden");
    await dashboardRouter.push("/levantamientos");
    expect(dashboardRouter.currentRoute.value.name).toBe(
      "construction-surveys",
    );
    auth.user.role = "supervisor";
    await dashboardRouter.push("/levantamientos/nuevos-hidrantes");
    expect(dashboardRouter.currentRoute.value.name).toBe("cabinets");
  });
});
