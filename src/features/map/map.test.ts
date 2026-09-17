/* eslint-disable vue/one-component-per-file -- Isolated test hosts and a canvas stub. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import { defineComponent, type PropType } from "vue";
import {
  apiParams,
  readMapQuery,
  validateFilters,
  filterCount,
} from "./map.filters";
import { adaptMapItem, loadMapLayer, mapEndpoints } from "./map.api.datasource";
import { api } from "@/api/client";
import { useMapLayers } from "./map.state";
import MapView from "./MapView.vue";
import type { Domain, Filters, MapItem } from "./map.types";
vi.mock("@/api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("./MapCanvas.vue", () => ({
  default: defineComponent({
    name: "MapCanvas",
    props: {
      items: { type: Array as PropType<MapItem[]>, default: () => [] },
      selected: { type: String, default: undefined },
      fitKey: { type: Number, default: 0 },
    },
    emits: ["select", "bounds"],
    template:
      '<div class="canvas-stub"><button v-for="item in items" @click="$emit(\'select\',item.key)">Marker {{ item.title }}</button></div>',
  }),
}));
const raw = {
  hydrants: {
    hydrantId: "h1",
    accountNumber: "RV-100",
    latitude: 22,
    longitude: -102,
    rvStatus: "completed",
    reviewed: true,
    inspectionCount: 3,
    latestInspectionId: "i1",
  },
  construction: {
    surveyId: "c1",
    displayIdentifier: "BASE-200",
    latitude: 22,
    longitude: -102,
    status: "in_progress",
    currentStep: 3,
    accuracy: 2,
  },
  diagnostics: {
    caseId: "d1",
    meterId: "METER-300",
    latitude: 22,
    longitude: -102,
    overallVerdict: "APROBADO",
    measurementSources: ["BLE"],
    measurementSource: "BLE",
    sampleId: "s1",
    flowPointCode: "Q2",
    gpsAccuracyM: 3,
    hasBle: true,
    isSimulation: false,
  },
};
beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.get).mockImplementation(async (url) => {
    const d = (Object.keys(mapEndpoints) as Domain[]).find(
      (d) => mapEndpoints[d] === url,
    )!;
    const page = { items: [raw[d]], limit: 2000, truncated: false };
    return { data: d === "diagnostics" ? { data: page } : page };
  });
});
async function view(query = "view=all") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/mapa", component: MapView },
      {
        path: "/:pathMatch(.*)*",
        component: { template: "<div>Expediente</div>" },
      },
    ],
  });
  await router.push("/mapa?" + query);
  await router.isReady();
  const wrapper = mount(MapView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}
describe("map contracts and semantic adaptation", () => {
  it("restores only recognized URL state and layers", () => {
    expect(readMapQuery({ view: "wrong", junk: "x" })).toEqual({
      view: "hydrants",
      filters: { d_simulation: "exclude" },
      layers: ["hydrants", "construction", "diagnostics"],
    });
    expect(
      readMapQuery({ view: "all", layers: "diagnostics", d_simulation: "only" })
        .layers,
    ).toEqual(["diagnostics"]);
    expect(readMapQuery({ layers: "" }).layers).toEqual([]);
  });
  it("defaults to real diagnostics and keeps bbox and BLE server-side", () => {
    expect(
      apiParams(
        "diagnostics",
        { d_measurementSource: "BLE", search: "METER" },
        { north: 23, south: 21, west: -103, east: -101 },
      ),
    ).toMatchObject({
      simulation: "exclude",
      measurementSource: "BLE",
      query: "METER",
      north: 23,
    });
  });
  it("maps dates according to each domain and local inclusive end-day", () => {
    const f = { from: "2026-09-01", to: "2026-09-01" };
    expect(apiParams("hydrants", f)).toMatchObject({
      lastFrom: "2026-09-01T07:00:00.000Z",
      lastTo: "2026-09-02T07:00:00.000Z",
    });
    expect(apiParams("construction", f).from).toBe("2026-09-01T07:00:00.000Z");
  });
  it("validates date, search, flow and UUID filters and counts only active domain", () => {
    for (const f of [
      { from: "2026-09-02", to: "2026-09-01" },
      { search: "a" },
      { h_flowMin: "5", h_flowMax: "2" },
      { d_userId: "bad" },
    ] as Filters[])
      expect(validateFilters(f)).not.toBe("");
    expect(
      filterCount(
        { d_simulation: "exclude", h_reviewed: "true", c_stage: "3" },
        "hydrants",
      ),
    ).toBe(1);
  });
  it.each([null, undefined, 91, Infinity, NaN])(
    "does not invent coordinates for latitude %s",
    (latitude) => {
      expect(
        adaptMapItem("hydrants", { ...raw.hydrants, latitude }),
      ).toBeNull();
    },
  );
  it("preserves recorded zero, GPS provenance, Bluetooth and simulation flags", () => {
    const row = adaptMapItem("diagnostics", {
      ...raw.diagnostics,
      latitude: 0,
      longitude: 0,
      hasSimulation: true,
    })!;
    expect(row.simulation).toBe(true);
    expect(row.details).toContainEqual(["Bluetooth / ESP32", "Sí"]);
    expect(row.details).toContainEqual(["Muestra GPS", "s1"]);
    expect(row.href).toBe("/diagnosticos/d1");
  });
  it.each(["hydrants", "construction", "diagnostics"] as const)(
    "%s uses the real compact endpoint",
    async (d) => {
      const page = await loadMapLayer(d, {});
      expect(api.get).toHaveBeenCalledWith(mapEndpoints[d], expect.any(Object));
      expect(page.items).toHaveLength(1);
      expect(page.items[0]!.domain).toBe(d);
    },
  );
});
describe("map UI and state", () => {
  it("preserves the selected dossier while a viewport response temporarily excludes its point", async () => {
    const { wrapper } = await view("view=hydrants");
    await wrapper.find(".map-result").trigger("click");
    const component = wrapper.getComponent({ name: "MapCanvas" });
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { items: [], limit: 2000, truncated: false },
    });
    component.vm.$emit("bounds", {
      north: 30,
      south: 29,
      west: -103,
      east: -101,
    });
    await flushPromises();
    expect(
      wrapper.find('[aria-label="Elemento seleccionado"]').text(),
    ).toContain("RV-100");
    await wrapper.find('[aria-label="Cerrar detalle"]').trigger("click");
    expect(wrapper.find('[aria-label="Elemento seleccionado"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });
  it("renders three layers, contextual legend and cards without navigating on marker click", async () => {
    const { wrapper, router } = await view();
    expect(wrapper.findAll(".map-result")).toHaveLength(3);
    expect(wrapper.text()).toContain("Colores y estados");
    await wrapper.findAll(".canvas-stub button")[0]!.trigger("click");
    expect(router.currentRoute.value.path).toBe("/mapa");
    expect(
      wrapper.find('[aria-label="Elemento seleccionado"]').text(),
    ).toContain("RV-100");
    expect(wrapper.find('a[href="/hidrantes/h1"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/revisiones/i1"]').exists()).toBe(true);
    wrapper.unmount();
  });
  it("switches view in URL and shows only relevant filter groups", async () => {
    const { wrapper, router } = await view("view=hydrants");
    await wrapper.findAll(".map-views button")[4]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.view).toBe("diagnostics");
    expect(wrapper.findAll("fieldset")).toHaveLength(1);
    expect(wrapper.text()).toContain("Fuente de medición");
    wrapper.unmount();
  });
  it("shows Construction popup and navigation", async () => {
    const { wrapper } = await view("view=construction&c_stage=3");
    await wrapper.find(".map-result").trigger("click");
    expect(wrapper.find('a[href="/levantamientos/c1"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Precisión GPS");
    expect(api.get).toHaveBeenCalledWith(
      mapEndpoints.construction,
      expect.objectContaining({
        params: expect.objectContaining({ stage: "3" }),
      }),
    );
    wrapper.unmount();
  });
  it("shows functional verdict, BLE and navigation with simulations excluded", async () => {
    const { wrapper } = await view("view=diagnostics");
    await wrapper.find(".map-result").trigger("click");
    expect(wrapper.text()).toContain("Aprobado");
    expect(wrapper.text()).toContain("Bluetooth / ESP32");
    expect(wrapper.find('a[href="/diagnosticos/d1"]').exists()).toBe(true);
    expect(api.get).toHaveBeenCalledWith(
      mapEndpoints.diagnostics,
      expect.objectContaining({
        params: expect.objectContaining({ simulation: "exclude" }),
      }),
    );
    wrapper.unmount();
  });
  it("toggles combined layers while preserving URL", async () => {
    const { wrapper, router } = await view();
    await wrapper.findAll(".map-layers input")[2]!.setValue(false);
    await flushPromises();
    expect(wrapper.findAll(".map-result")).toHaveLength(2);
    expect(router.currentRoute.value.query.layers).not.toContain("diagnostics");
    wrapper.unmount();
  });
  it("shows partial error and preserves successful layers", async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === mapEndpoints.diagnostics) throw Error("offline");
      return {
        data: {
          items: [
            url === mapEndpoints.hydrants ? raw.hydrants : raw.construction,
          ],
          limit: 2000,
          truncated: false,
        },
      };
    });
    const { wrapper } = await view();
    expect(wrapper.findAll(".map-result")).toHaveLength(2);
    expect(wrapper.text()).toContain("Diagnósticos no disponibles");
    wrapper.unmount();
  });
  it("handles empty and total failure without fictitious markers", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], limit: 2000, truncated: false },
    });
    const { wrapper } = await view("view=hydrants");
    expect(wrapper.text()).toContain(
      "No hay elementos con coordenadas válidas",
    );
    wrapper.unmount();
    vi.mocked(api.get).mockRejectedValue(Error("offline"));
    const failed = await view();
    expect(failed.wrapper.text()).toContain("No se pudieron cargar");
    failed.wrapper.unmount();
  });
  it("ignores stale completions and cancels obsolete requests", async () => {
    let resolveOld!: (v: unknown) => void;
    let maps!: ReturnType<typeof useMapLayers>;
    const host = mount(
      defineComponent({
        setup() {
          maps = useMapLayers();
          return () => null;
        },
      }),
    );
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );
    const old = maps.load(["hydrants"], { search: "old" });
    const signal = vi.mocked(api.get).mock.calls[0]![1]!.signal;
    await maps.load(["hydrants"], { search: "new" });
    expect(signal?.aborted).toBe(true);
    resolveOld({ data: { items: [], limit: 2000, truncated: false } });
    await old;
    expect(maps.state.hydrants.items).toHaveLength(1);
    host.unmount();
  });
});

describe("status colors, reviews and nearby hydrants", () => {
  it("uses server-side reviews scope and clears it when returning to the universe", async () => {
    const { wrapper, router } = await view(
      "view=reviews&h_hasInspections=false",
    );
    expect(router.currentRoute.value.query.view).toBe("reviews");
    expect(api.get).toHaveBeenCalledWith(
      mapEndpoints.hydrants,
      expect.objectContaining({
        params: expect.objectContaining({ hasInspections: "true" }),
      }),
    );
    const tab = wrapper
      .findAll(".map-views button")
      .find((b) => b.text() === "Hidrantes")!;
    await tab.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.h_hasInspections).toBeUndefined();
    expect(vi.mocked(api.get).mock.lastCall?.[1]?.params).not.toHaveProperty(
      "hasInspections",
    );
    wrapper.unmount();
  });
  it("legend shows only active domains and states present in the viewport", async () => {
    const { wrapper } = await view("view=diagnostics");
    const legend = wrapper.get(".map-legend");
    expect(legend.text()).toContain("Aprobado");
    expect(legend.text()).not.toContain("Levantamientos");
    expect(legend.text()).not.toContain("Rechazado");
    wrapper.unmount();
  });
  it("allows selecting every account in a merged point without losing its dossier", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [
          raw.hydrants,
          {
            ...raw.hydrants,
            hydrantId: "h2",
            accountNumber: "RV-101",
            rvStatus: "pending",
          },
        ],
        limit: 2000,
        truncated: false,
      },
    });
    const { wrapper } = await view("view=hydrants");
    expect(wrapper.findAll(".canvas-stub button")).toHaveLength(1);
    await wrapper.find(".canvas-stub button").trigger("click");
    expect(
      wrapper
        .get('[aria-label="Hidrante del punto agrupado"]')
        .findAll("option"),
    ).toHaveLength(2);
    await wrapper
      .get('[aria-label="Hidrante del punto agrupado"]')
      .setValue("hydrants:h2");
    expect(wrapper.find('a[href="/hidrantes/h2"]').exists()).toBe(true);
    expect(wrapper.get(".map-legend").text()).toContain("estados distintos");
    wrapper.unmount();
  });
});

describe("load once and explicit update", () => {
  it("keeps cached points on viewport changes and recenter; updates explicitly without bbox", async () => {
    const { wrapper } = await view("view=hydrants");
    const canvas = wrapper.getComponent({ name: "MapCanvas" });
    expect(api.get).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 6; i++)
      canvas.vm.$emit("bounds", {
        north: 30 + i,
        south: 29,
        east: -101,
        west: -103,
      });
    await flushPromises();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(canvas.props("items")).toHaveLength(1);
    expect(wrapper.findAll(".map-result")).toHaveLength(0);
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Ver conjunto")!
      .trigger("click");
    await flushPromises();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll(".map-result")).toHaveLength(1);
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Actualizar")!
      .trigger("click");
    await flushPromises();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.get).mock.lastCall?.[1]?.params).not.toHaveProperty(
      "north",
    );
    wrapper.unmount();
  });
  it("preserves existing points when manual refresh fails and reports stale data", async () => {
    const { wrapper } = await view("view=hydrants");
    vi.mocked(api.get).mockRejectedValueOnce(Error("offline"));
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Actualizar")!
      .trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".map-result")).toHaveLength(1);
    expect(wrapper.text()).toContain("Se conservan los puntos anteriores");
    wrapper.unmount();
  });
});
