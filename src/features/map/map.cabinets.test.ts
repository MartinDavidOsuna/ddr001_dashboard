import { describe, expect, it, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { api } from "@/api/client";
import { apiParams, availableDomains } from "./map.filters";
import { adaptCabinetMapItem, loadMapLayer } from "./map.api.datasource";
import { statusStyle, legendEntries } from "./map.colors";
import MapView from "./MapView.vue";
import { assertContract } from "@/features/cabinets/cabinets.contract";
import type { CabinetAdminRow } from "@/features/cabinets/cabinets.generated";
import fixture from "../../../tests/fixtures/cabinets.json";
const state = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ user: { role: state.role } }),
}));
vi.mock("@/api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("./MapCanvas.vue", () => ({
  default: { props: ["items"], template: "<div />" },
}));
beforeEach(() => {
  state.role = "admin";
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async (url) => ({
    data: String(url).endsWith("/cabinets/metrics")
      ? fixture.metrics
      : String(url).endsWith("/cabinets/map")
        ? fixture.map
        : String(url).includes("functional-diagnostics")
          ? { data: { items: [], truncated: false, limit: 2000 } }
          : { items: [], truncated: false, limit: 2000 },
  }));
});
const row = () =>
  assertContract<CabinetAdminRow>("CabinetAdminRow", fixture.row);
async function view(query = "view=all") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/mapa", component: MapView }],
  });
  await router.push("/mapa?" + query);
  const w = mount(MapView, { global: { plugins: [router] } });
  await flushPromises();
  return { w, router };
}
describe("Nuevos Hidrantes as an independent authorized map layer", () => {
  it.each(["admin", "supervisor", "viewer"])(
    "loads only permitted layers for %s in Todos",
    async (role) => {
      state.role = role;
      const { w } = await view();
      expect(w.find('input[aria-label="Nuevos Hidrantes"]').exists()).toBe(
        role !== "viewer",
      );
      expect(
        vi
          .mocked(api.get)
          .mock.calls.some(([url]) => String(url).endsWith("/cabinets/map")),
      ).toBe(role !== "viewer");
      expect(availableDomains(role)).toContain("construction");
      expect(availableDomains(role)).toContain("hydrants");
      expect(availableDomains(role)).toContain("diagnostics");
      w.unmount();
    },
  );
  it("does not request forbidden direct cabinets layer for viewer", async () => {
    state.role = "viewer";
    const { w } = await view("view=cabinets");
    expect(api.get).not.toHaveBeenCalled();
    expect(w.text()).toContain("requiere un rol administrador");
    w.unmount();
  });
  it("uses installation GPS only and links the UID popup to its dossier", () => {
    const item = adaptCabinetMapItem(row())!;
    expect(item.title).toBe("AQ26-00001-7");
    expect(item.href).toContain("/levantamientos/nuevos-hidrantes/");
    expect(item.details).toContainEqual(["Modelo", "A3-A"]);
    expect(statusStyle(item).label).toBe("Instalado");
    expect(legendEntries([item], "cabinets")[0]!.count).toBe(1);
    expect(adaptCabinetMapItem({ ...row(), location: null })).toBeNull();
    expect(
      adaptCabinetMapItem({ ...row(), installationValid: false }),
    ).toBeNull();
    expect(adaptCabinetMapItem({ ...row(), status: "draft" })).toBeNull();
  });
  it("sends shared filters, false variant, date semantics and bbox to the real endpoint", async () => {
    const bbox = { north: 23, south: 21, west: -104, east: -101 };
    expect(
      apiParams(
        "cabinets",
        {
          n_model: "A3",
          n_automated: "false",
          n_status: "installed",
          n_crewId: fixture.row.crew.id,
          from: "2026-10-01",
          to: "2026-10-12",
          search: "AQ26-00001-7",
        },
        bbox,
      ),
    ).toMatchObject({
      ...bbox,
      model: "A3",
      automated: "false",
      status: "installed",
      to: "2026-10-13T07:00:00.000Z",
    });
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...fixture.map, truncated: true, limit: 1 },
    });
    const page = await loadMapLayer("cabinets", {}, bbox);
    expect(page.truncated).toBe(true);
    expect(page.items).toHaveLength(1);
  });
  it("shows localized forbidden refresh, preserves snapshots and supports empty/truncated maps", async () => {
    const { w } = await view("view=cabinets");
    expect(w.text()).toContain("AQ26-00001-7");
    vi.mocked(api.get).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403 },
    });
    await w
      .findAll("button")
      .find((b) => b.text() === "Actualizar")!
      .trigger("click");
    await flushPromises();
    expect(w.text()).toContain("sólo para administradores y supervisores");
    expect(w.text()).toContain("AQ26-00001-7");
    vi.mocked(api.get).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 503 },
    });
    await w
      .findAll("button")
      .find((b) => b.text() === "Actualizar")!
      .trigger("click");
    await flushPromises();
    expect(w.text()).toContain("no está disponible o actualizado");
    expect(w.text()).toContain("AQ26-00001-7");
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...fixture.map, items: [], truncated: true, limit: 1 },
    });
    await w
      .findAll("button")
      .find((b) => b.text() === "Actualizar")!
      .trigger("click");
    await flushPromises();
    expect(w.text()).toContain("conteos no son totales globales");
    w.unmount();
  });
});
