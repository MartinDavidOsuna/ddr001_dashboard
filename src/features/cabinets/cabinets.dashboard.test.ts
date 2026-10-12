import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import DashboardView from "@/features/dashboard/DashboardView.vue";
const session = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ user: { role: session.role } }),
}));
describe("Executive dashboard role separation", () => {
  it.each(["admin", "supervisor", "viewer"])(
    "preserves existing sections and shows cabinets only for authorized %s",
    async (role) => {
      session.role = role;
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/dashboard", component: DashboardView },
          { path: "/diagnosticos", component: { template: "<div />" } },
        ],
      });
      await router.push("/dashboard");
      const w = mount(DashboardView, {
        global: {
          plugins: [router],
          stubs: {
            InspectionDashboardSection: true,
            ConstructionDashboardSection: true,
            DiagnosticDashboardSection: true,
            CabinetDashboardSection: true,
          },
        },
      });
      expect(w.find("inspection-dashboard-section-stub").exists()).toBe(true);
      expect(w.find("construction-dashboard-section-stub").exists()).toBe(true);
      expect(w.find("diagnostic-dashboard-section-stub").exists()).toBe(true);
      expect(w.find("cabinet-dashboard-section-stub").exists()).toBe(
        role !== "viewer",
      );
      w.unmount();
    },
  );
});
