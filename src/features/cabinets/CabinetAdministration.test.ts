import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import CabinetAdministration from "./CabinetAdministration.vue";
import { cabinetsApi } from "./cabinets.api";
import { assertContract } from "./cabinets.contract";
import type {
  CabinetAdminDossier,
  CabinetAdminMutationResult,
} from "./cabinets.generated";
import fixture from "../../../tests/fixtures/cabinets.json";
vi.mock("./cabinets.api", () => ({
  cabinetsApi: {
    options: vi.fn(),
    edit: vi.fn(),
    cancelInstallation: vi.fn(),
    delete: vi.fn(),
  },
}));
const dossier = () =>
  assertContract<CabinetAdminDossier>(
    "CabinetAdminDossier",
    structuredClone(fixture.dossier),
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cabinetsApi.options).mockResolvedValue({
    models: ["A1", "A2", "A3", "A4"],
    companies: [{ id: fixture.row.crew.id, name: fixture.row.crew.name }],
  });
  const result = {
    cabinet: fixture.dossier.history[0]!.cabinet,
    approvalInvalidated: true,
    replayed: false,
  } as CabinetAdminMutationResult;
  vi.mocked(cabinetsApi.edit).mockResolvedValue(result);
  vi.mocked(cabinetsApi.cancelInstallation).mockResolvedValue(result);
  vi.mocked(cabinetsApi.delete).mockResolvedValue(result);
});
function view(
  role: "admin" | "supervisor" | "viewer" = "admin",
  value = dossier(),
) {
  const pinia = createPinia(),
    auth = useAuthStore(pinia);
  auth.user = { userId: "admin-id", role } as NonNullable<typeof auth.user>;
  return mount(CabinetAdministration, {
    props: { dossier: value },
    global: { plugins: [pinia] },
  });
}
function button(w: ReturnType<typeof view>, text: string) {
  return w.findAll("button").find((b) => b.text() === text)!;
}
describe("Cabinet administration controls", () => {
  it.each(["supervisor", "viewer"] as const)(
    "hides administrative controls for %s",
    (role) => {
      const w = view(role);
      expect(w.find("section").exists()).toBe(false);
      expect(cabinetsApi.options).not.toHaveBeenCalled();
      w.unmount();
    },
  );
  it("requires cancellation reason and confirmation and never automatically deletes", async () => {
    const w = view();
    await button(w, "Cancelar instalación").trigger("click");
    expect(w.text()).toContain("La base no será eliminada");
    expect(w.text()).toContain("evidencias se conservarán");
    await w.get("form").trigger("submit");
    expect(cabinetsApi.cancelInstallation).not.toHaveBeenCalled();
    await w.get("textarea").setValue("Instalación física retirada");
    await w.get("form").trigger("submit");
    expect(cabinetsApi.cancelInstallation).not.toHaveBeenCalled();
    await w.get('input[type="checkbox"]').setValue(true);
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(cabinetsApi.cancelInstallation).toHaveBeenCalledWith(
      fixture.dossier.identification.cabinetId,
      expect.objectContaining({
        reason: "Instalación física retirada",
        confirm: true,
        expectedVersion: fixture.dossier.identification.version,
      }),
    );
    expect(cabinetsApi.delete).not.toHaveBeenCalled();
    expect(w.emitted("changed")).toHaveLength(1);
    w.unmount();
  });
  it("blocks deletion while there is any active installation/base", () => {
    const w = view();
    expect(button(w, "Eliminar gabinete").attributes("disabled")).toBeDefined();
    w.unmount();
  });
  it("requires a separate strong UID confirmation before logical deletion", async () => {
    const d = dossier();
    d.base = null;
    d.installation.data = null;
    d.installation.closureOperationId = null;
    d.installation.valid = false;
    d.finalReview.approval = null;
    d.identification.status = "validated";
    const w = view("admin", d);
    await button(w, "Eliminar gabinete").trigger("click");
    await w.get("textarea").setValue("Baja administrativa");
    await w.get('input[type="checkbox"]').setValue(true);
    await w.get("form").trigger("submit");
    expect(cabinetsApi.delete).not.toHaveBeenCalled();
    await w.get('input[autocomplete="off"]').setValue(d.identification.uid);
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(cabinetsApi.delete).toHaveBeenCalledWith(
      d.identification.cabinetId,
      expect.objectContaining({
        confirmUid: d.identification.uid,
        confirm: true,
      }),
    );
    expect(w.emitted("deleted")).toHaveLength(1);
    w.unmount();
  });
  it("preloads existing fields, uses API catalogs and submits only changed allowlisted fields", async () => {
    const w = view();
    await button(w, "Editar gabinete").trigger("click");
    await flushPromises();
    expect(cabinetsApi.options).toHaveBeenCalledOnce();
    expect(w.findAll("select")[1]!.element.value).toBe(
      fixture.dossier.identification.model,
    );
    expect(w.find('input[autocomplete="off"]').exists()).toBe(false);
    await w
      .findAll("textarea")[0]!
      .setValue("Información administrativa corregida");
    await w.findAll("textarea").at(-1)!.setValue("Corrección solicitada");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(cabinetsApi.edit).toHaveBeenCalledWith(
      fixture.dossier.identification.cabinetId,
      expect.objectContaining({
        changes: {
          administrativeNotes: "Información administrativa corregida",
        },
      }),
    );
    expect(w.emitted("changed")).toHaveLength(1);
    w.unmount();
  });
  it("reuses the operation UUID after a lost response and permits cancel without saving", async () => {
    vi.mocked(cabinetsApi.cancelInstallation).mockRejectedValueOnce(
      new Error("response lost"),
    );
    const w = view();
    await button(w, "Cancelar instalación").trigger("click");
    await w.get("textarea").setValue("Motivo de cancelación");
    await w.get('input[type="checkbox"]').setValue(true);
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.get('[role="alert"]').text()).toContain("reintentar");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(
      vi.mocked(cabinetsApi.cancelInstallation).mock.calls[0]![1].operationId,
    ).toBe(
      vi.mocked(cabinetsApi.cancelInstallation).mock.calls[1]![1].operationId,
    );
    await button(w, "Editar gabinete").trigger("click");
    await flushPromises();
    await button(w, "Volver sin cambios").trigger("click");
    expect(cabinetsApi.edit).not.toHaveBeenCalled();
    w.unmount();
  });
});
