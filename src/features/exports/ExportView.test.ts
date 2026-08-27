import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExportView from "./ExportView.vue";

const service = vi.hoisted(() => ({
  filters: vi.fn(),
  exportFile: vi.fn(),
}));

vi.mock("@/services/dashboard", () => ({ dashboardService: service }));
vi.mock("@/api/client", () => ({
  problemMessage: (_cause: unknown, fallback: string) => fallback,
}));

describe("ExportView", () => {
  beforeEach(() => {
    service.filters.mockResolvedValue({ technicians: [], crews: [], statuses: [] });
    service.exportFile.mockReset();
  });

  it("muestra un error comprensible cuando falla la descarga", async () => {
    service.exportFile.mockRejectedValue(new Error("internal stack"));
    const wrapper = mount(ExportView);
    await flushPromises();

    await wrapper.get(".action-card button").trigger("click");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe(
      "No fue posible generar la exportación.",
    );
    expect(wrapper.text()).not.toContain("internal stack");
  });

  it("selecciona CSV y entrega esa selección al servicio", async () => {
    service.exportFile.mockResolvedValue("DDR001_revisiones_2026-08-27.csv");
    const wrapper = mount(ExportView);
    await flushPromises();

    await wrapper.get(".format:nth-child(2)").trigger("click");
    await wrapper.get(".action-card button").trigger("click");
    await flushPromises();

    expect(service.exportFile).toHaveBeenCalledWith(
      "inspections-csv",
      expect.any(Object),
      expect.any(Object),
    );
    expect(wrapper.get('[role="status"]').text()).toContain(
      "DDR001_revisiones_2026-08-27.csv",
    );
  });
});
