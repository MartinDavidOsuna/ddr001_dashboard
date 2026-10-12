import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { assertContract } from "./cabinets.contract";
import { cabinetsApi } from "./cabinets.api";
import { label } from "./cabinets.format";
import type {
  CabinetAdminDossier,
  CabinetAdminList,
  CabinetAdminMetrics,
  CabinetAdminSummary,
} from "./cabinets.generated";
import CabinetListView from "./CabinetListView.vue";
import CabinetDetailView from "./CabinetDetailView.vue";
import CabinetPhoto from "./CabinetPhoto.vue";
import fixture from "../../../tests/fixtures/cabinets.json";
vi.mock("./cabinets.api", () => ({
  cabinetsApi: {
    list: vi.fn(),
    metrics: vi.fn(),
    summary: vi.fn(),
    detail: vi.fn(),
    photo: vi.fn(),
  },
}));
const global = { stubs: { EChart: true } };
const dossier = () =>
  assertContract<CabinetAdminDossier>(
    "CabinetAdminDossier",
    structuredClone(fixture.dossier),
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cabinetsApi.list).mockResolvedValue(
    assertContract<CabinetAdminList>("CabinetAdminList", fixture.list),
  );
  vi.mocked(cabinetsApi.summary).mockResolvedValue(
    assertContract<CabinetAdminSummary>("CabinetAdminSummary", fixture.summary),
  );
  vi.mocked(cabinetsApi.metrics).mockResolvedValue(
    assertContract<CabinetAdminMetrics>("CabinetAdminMetrics", fixture.metrics),
  );
  vi.mocked(cabinetsApi.detail).mockResolvedValue(dossier());
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
async function view(
  component = CabinetListView,
  path = "/levantamientos/nuevos-hidrantes",
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/levantamientos/nuevos-hidrantes", component: CabinetListView },
      { path: "/mapa", component: { template: "<div />" } },
      {
        path: "/levantamientos/nuevos-hidrantes/:cabinetId",
        component: CabinetDetailView,
      },
      {
        path: "/levantamientos/bases/:surveyId",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const w = mount(component, { global: { ...global, plugins: [router] } });
  await flushPromises();
  return { w, router };
}
describe("Cabinets listing", () => {
  it.each([
    ["search", "AQ26000017"],
    ["search", "AQ26-00001-7"],
    ["uid", "AQ26000017"],
    ["uid", "AQ26-00001-7"],
    ["model", "A1"],
    ["automated", "true"],
    ["automated", "false"],
    ["status", "incomplete"],
    ["crewId", fixture.row.crew.id],
    ["baseSurveyId", fixture.row.base.surveyId],
    ["accountNumber", "00123"],
  ])(
    "sends deep-link %s=%s to server, never filters local records",
    async (key, value) => {
      const { w } = await view(
        CabinetListView,
        "/levantamientos/nuevos-hidrantes?" +
          new URLSearchParams({ [key!]: value! }),
      );
      expect(cabinetsApi.list).toHaveBeenCalledWith(
        { page: 1, pageSize: 25, [key!]: value },
        expect.any(AbortSignal),
      );
      expect(cabinetsApi.detail).not.toHaveBeenCalled();
      w.unmount();
    },
  );
  it("loads summary, metrics and one server page without dossier/photo N+1; renders mobile labels and milestones", async () => {
    const { w } = await view();
    expect(cabinetsApi.list).toHaveBeenCalledWith(
      { page: 1, pageSize: 25 },
      expect.any(AbortSignal),
    );
    expect(cabinetsApi.detail).not.toHaveBeenCalled();
    expect(cabinetsApi.photo).not.toHaveBeenCalled();
    expect(w.text()).toContain("7 / 460");
    expect(w.text()).toContain("Registro alcanzado");
    expect(w.text()).toContain("Sin datos suficientes");
    expect(w.text()).toContain("Sin empresa / Sin asignación");
    expect(w.get('[data-label="UID"]').text()).toBe("AQ26-00001-7");
    expect(w.get('[data-label="Modelo"]').text()).toBe("A3-A");
    expect(w.text()).toContain("Cuenta distinta a la base");
    w.unmount();
  });
  it("filters all supported fields, retains false, paginates and preserves URL on back", async () => {
    const { w, router } = await view();
    await w
      .get('input[placeholder="UID, base, cuenta, empresa o modelo"]')
      .setValue("AQ26-00001-7");
    const form = w.get("form");
    const selects = form.findAll("select");
    await selects[0]!.setValue("installed");
    await selects[1]!.setValue("A3");
    await selects[2]!.setValue("false");
    await selects[3]!.setValue(fixture.row.crew.id);
    await form.trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.query).toMatchObject({
      search: "AQ26-00001-7",
      status: "installed",
      model: "A3",
      automated: "false",
      crewId: fixture.row.crew.id,
      page: "1",
    });
    expect(cabinetsApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ automated: "false", search: "AQ26-00001-7" }),
      expect.any(AbortSignal),
    );
    const next = w.findAll("button").find((b) => b.text() === "Siguiente")!;
    await next.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.page).toBe("2");
    router.back();
    await flushPromises();
    expect(router.currentRoute.value.query.page).toBe("1");
    expect(
      w
        .get('a[href*="/levantamientos/nuevos-hidrantes/0000"]')
        .attributes("href"),
    ).toContain("automated=false");
    w.unmount();
  });
  it("supports independent chart errors, empty page, 403/503 and retry", async () => {
    vi.mocked(cabinetsApi.metrics).mockRejectedValue({
      isAxiosError: true,
      response: { status: 503 },
    });
    vi.mocked(cabinetsApi.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    });
    const { w } = await view();
    expect(w.text()).toContain("No hay nuevos hidrantes");
    expect(w.text()).toContain("no está disponible o actualizado");
    vi.mocked(cabinetsApi.list).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403 },
    });
    await w.get("form").trigger("submit");
    // Same URL submission is a no-op; explicit reload after changing a filter requests again.
    await w
      .get('input[placeholder="UID, base, cuenta, empresa o modelo"]')
      .setValue("error");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("sólo para administradores");
    w.unmount();
  });
});
describe("Cabinet dossier", () => {
  it("preserves historical series, attempts, account discrepancy, null captures, checklist and one shared photo", async () => {
    const { w } = await view(
      CabinetDetailView,
      `/levantamientos/nuevos-hidrantes/${fixture.row.cabinetId}?search=keep&page=2`,
    );
    expect(w.text()).toContain("000ABC007");
    expect(w.text()).toContain("Opcional sin capturar");
    expect(w.text()).toContain("Ilegible");
    expect(w.text()).toContain("La cuenta de la base");
    expect(w.text()).toContain("42.5 m");
    expect(w.text()).toContain("Aprobación invalidada");
    expect(w.text()).toContain("aprobación histórica invalidada");
    expect(w.text()).toContain("Prueba obligatoria pendiente");
    expect(w.text()).toContain("Intentos de validación (2)");
    expect(w.findAllComponents(CabinetPhoto)).toHaveLength(1);
    expect(
      w
        .find(`a[href="/levantamientos/bases/${fixture.row.cabinetId}"]`)
        .exists(),
    ).toBe(true);
    expect(w.get(".back-link").attributes("href")).toContain("page=2");
    expect(cabinetsApi.detail).toHaveBeenCalledTimes(1);
    expect(cabinetsApi.photo).not.toHaveBeenCalled();
    w.unmount();
  });
  it.each([
    "draft",
    "registered",
    "incomplete",
    "validated",
    "installed",
    "deliverable",
  ] as const)(
    "renders %s with no base/company and null final date",
    async (status) => {
      const data = dossier();
      data.identification.status = status;
      data.identification.automated = false;
      data.identification.displayModel = "A1";
      data.base = null;
      data.identification.crew = null;
      data.identification.deliverableAt = null;
      vi.mocked(cabinetsApi.detail).mockResolvedValue(data);
      const { w } = await view(
        CabinetDetailView,
        `/levantamientos/nuevos-hidrantes/${fixture.row.cabinetId}`,
      );
      expect(w.text()).toContain("Sin base vinculada");
      expect(w.text()).toContain("Sin empresa / Sin asignación");
      if (status === "deliverable")
        expect(w.text()).toContain("HIDRANTE ENTREGABLE");
      expect(w.text()).not.toContain("Entregado");
      w.unmount();
    },
  );
  it.each([
    "approved",
    "correction_required",
    "approval_invalidated",
    "affected_data_pending",
    "mandatory_tests_pending",
    "pending_review",
    "not_installed",
  ] as const)("uses projected finalReview state %s", async (state) => {
    const data = dossier();
    data.finalReview.state = state;
    if (state === "correction_required")
      data.finalReview.correction = {
        operationId: fixture.row.cabinetId,
        reason: "Corregir conexiones",
      };
    vi.mocked(cabinetsApi.detail).mockResolvedValue(data);
    const { w } = await view(
      CabinetDetailView,
      `/levantamientos/nuevos-hidrantes/${fixture.row.cabinetId}`,
    );
    expect(w.get("#final-review").text()).toContain(label(state));
    if (state === "correction_required")
      expect(w.text()).toContain("Corregir conexiones");
    w.unmount();
  });
});
