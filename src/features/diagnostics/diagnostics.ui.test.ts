import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../tests/fixtures/functional-diagnostics.json";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import { adaptDetail } from "./diagnostics.adapters";
import type { RawDetail, Summary, CaseItem, User } from "./diagnostics.types";
import DiagnosticListView from "./DiagnosticListView.vue";
import DiagnosticSample from "./DiagnosticSample.vue";
import DiagnosticReviewPanel from "./DiagnosticReviewPanel.vue";
import DiagnosticEvidenceThumbnail from "./DiagnosticEvidenceThumbnail.vue";
import DiagnosticUserAccess from "./DiagnosticUserAccess.vue";
import DiagnosticDetailView from "./DiagnosticDetailView.vue";
const state = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ user: { role: state.role } }),
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { caseId: "case" } }),
}));
vi.mock("./diagnostics.api.datasource", () => ({
  diagnosticsApi: {
    summary: vi.fn(),
    cases: vi.fn(),
    detail: vi.fn(),
    metrics: vi.fn(),
    trends: vi.fn(),
    users: vi.fn(),
    access: vi.fn(),
    accessHistory: vi.fn(),
    updateAccess: vi.fn(),
    createReview: vi.fn(),
    evidence: vi.fn(),
    report: vi.fn(),
  },
}));
const global = {
  stubs: {
    EChart: true,
    RouterLink: { props: ["to"], template: '<a :href="to"><slot/></a>' },
  },
};
const paged = <T>(items: T[]) => ({
  items,
  page: { limit: 25, nextCursor: null, sort: "createdAtDesc" },
});
beforeEach(() => {
  vi.clearAllMocks();
  state.role = "admin";
  vi.mocked(diagnosticsApi.summary).mockResolvedValue(
    fixture.summary as unknown as Summary,
  );
  vi.mocked(diagnosticsApi.cases).mockResolvedValue(
    paged([fixture.caseItem as CaseItem]),
  );
  vi.mocked(diagnosticsApi.users).mockResolvedValue(
    paged([fixture.user as User]),
  );
  vi.mocked(diagnosticsApi.access).mockResolvedValue(fixture.access);
  vi.mocked(diagnosticsApi.accessHistory).mockResolvedValue(paged([]));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
describe("diagnostics UI", () => {
  it("loads real-only by default, renders cases and server-side filters", async () => {
    const w = mount(DiagnosticListView, { global });
    await flushPromises();
    expect(diagnosticsApi.cases).toHaveBeenCalledWith(
      expect.objectContaining({ simulation: "exclude" }),
      expect.any(AbortSignal),
    );
    expect(
      w.find(`a[href="/diagnosticos/${fixture.caseItem.caseId}"]`).exists(),
    ).toBe(true);
    await w
      .get('input[placeholder="Medidor, banco, técnico o correo"]')
      .setValue("meter");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(diagnosticsApi.cases).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "meter", cursor: undefined }),
      expect.any(AbortSignal),
    );
    w.unmount();
  });
  it("shows empty and API-error states without fake data", async () => {
    vi.mocked(diagnosticsApi.cases).mockResolvedValueOnce(paged([]));
    const w = mount(DiagnosticListView, { global });
    await flushPromises();
    expect(w.text()).toContain("No hay diagnósticos");
    vi.mocked(diagnosticsApi.cases).mockRejectedValue(new Error("offline"));
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Reintentar listado");
    w.unmount();
  });
  it("renders BLE settings, exact pulses, Q1–Q4 and sample evidence hierarchy", async () => {
    vi.mocked(diagnosticsApi.detail).mockResolvedValue(
      adaptDetail(fixture.detail as unknown as RawDetail),
    );
    const w = mount(DiagnosticDetailView, { global });
    await flushPromises();
    for (const q of ["Q1", "Q2", "Q3", "Q4"]) expect(w.text()).toContain(q);
    expect(w.text()).toContain("Bluetooth / ESP32");
    expect(w.text()).toContain("ESP32 Contract");
    expect(w.text()).toContain("Pulsos recibidos");
    expect(w.text()).toContain("Diagnóstico manual");
    expect(w.text()).toContain("SIMULACIÓN");
    expect(w.text()).toContain("comprometida");
    w.unmount();
  });
  it("does not render empty BLE section for simulation and highlights compromised acquisition", () => {
    const sample = adaptDetail(fixture.detail as unknown as RawDetail)
      .flowPoints[1]!.samples[0]!;
    const w = mount(DiagnosticSample, {
      props: { caseId: "c", sample },
      global,
    });
    expect(w.text()).toContain("SIMULACIÓN");
    expect(w.text()).toContain("Integridad de adquisición comprometida");
    expect(w.text()).not.toContain("Bluetooth / ESP32");
    w.unmount();
  });
  it.each(["viewer", "supervisor", "admin"])(
    "respects %s original and review permissions",
    async (role) => {
      state.role = role;
      const sample = adaptDetail(fixture.detail as unknown as RawDetail)
        .flowPoints[0]!.samples[0]!;
      const evidence = mount(DiagnosticEvidenceThumbnail, {
        props: { caseId: "c", evidence: sample.evidence[0]! },
        global,
      });
      const review = mount(DiagnosticReviewPanel, {
        props: { caseId: "c", reviews: [] },
        global,
      });
      expect(evidence.text().includes("Ver original")).toBe(role !== "viewer");
      expect(review.find("form").exists()).toBe(role !== "viewer");
      evidence.unmount();
      review.unmount();
    },
  );
  it("shows corrupted evidence as unavailable and never fetches it", () => {
    const sample = adaptDetail(fixture.detail as unknown as RawDetail)
      .flowPoints[0]!.samples[0]!;
    const w = mount(DiagnosticEvidenceThumbnail, {
      props: { caseId: "c", evidence: sample.evidence[1]! },
      global,
    });
    expect(w.text()).toContain("Miniatura no disponible");
    expect(w.text()).toContain("Anomalía");
    expect(diagnosticsApi.evidence).not.toHaveBeenCalled();
    w.unmount();
  });
  it("reuses review identity only for identical content after network failure", async () => {
    vi.mocked(diagnosticsApi.createReview).mockRejectedValue(
      new Error("offline"),
    );
    const w = mount(DiagnosticReviewPanel, {
      props: { caseId: "c", reviews: [] },
      global,
    });
    await w.get("textarea").setValue("Review A");
    await w.get("form").trigger("submit");
    await flushPromises();
    await w.get("form").trigger("submit");
    await flushPromises();
    const first = vi.mocked(diagnosticsApi.createReview).mock.calls;
    expect(first[0]![1].reviewId).toBe(first[1]![1].reviewId);
    await w.get("textarea").setValue("Review B");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(first[0]![1].reviewId).not.toBe(first[2]![1].reviewId);
    w.unmount();
  });
  it.each(["viewer", "supervisor", "admin"])(
    "limits access updates/history for %s",
    async (role) => {
      state.role = role;
      const w = mount(DiagnosticUserAccess, { global });
      await flushPromises();
      await w
        .findAll("button")
        .find((b) => b.text() === "Ver acceso")!
        .trigger("click");
      await flushPromises();
      expect(w.text().includes("Guardar acceso")).toBe(role === "admin");
      expect(diagnosticsApi.accessHistory).toHaveBeenCalledTimes(
        role === "admin" ? 1 : 0,
      );
      w.unmount();
    },
  );
  it("reloads access after a conflict and clears the stale change", async () => {
    const w = mount(DiagnosticUserAccess, { global });
    await flushPromises();
    await w
      .findAll("button")
      .find((b) => b.text() === "Ver acceso")!
      .trigger("click");
    await flushPromises();
    vi.mocked(diagnosticsApi.updateAccess).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: "ACCESS_VERSION_CONFLICT" }, status: 409 },
    });
    const form = w.findAll("form")[1]!;
    await form.get("select").setValue(false);
    await form.get("textarea").setValue("Reason");
    await form.trigger("submit");
    await flushPromises();
    expect(diagnosticsApi.access).toHaveBeenCalledTimes(2);
    expect(w.text()).toContain("Se volvió a consultar");
    expect(w.findAll("form")[1]!.get("textarea").element.value).toBe("");
    w.unmount();
  });
});
