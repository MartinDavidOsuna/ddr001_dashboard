import { describe, expect, it, vi } from "vitest";
import {
  exportFilename,
  exportRequest,
  hydrantExportFilters,
  inspectionExportFilters,
  saveExportBlob,
} from "./export-utils";

describe("export utilities", () => {
  it("selects every administrative server-side format", () => {
    expect(exportRequest("inspections-xlsx", {}, {}).path).toContain("inspections.xlsx");
    expect(exportRequest("inspections-csv", {}, {}).path).toContain("inspections.csv");
    expect(exportRequest("hydrants-xlsx", {}, {}).path).toContain("hydrants.xlsx");
  });

  it("builds inspection filters without pagination and closes the end date", () => {
    const filters = inspectionExportFilters({ page: 4, search: "002", status: "validated", from: "2026-08-01", to: "2026-08-02", gps: "" });
    expect(filters).toMatchObject({ search: "002", status: "validated" });
    expect(filters).not.toHaveProperty("page");
    expect(new Date(String(filters.to)).getTime() - new Date(String(filters.from)).getTime()).toBe(2 * 86_400_000);
  });

  it("preserves real hydrant filters and omits empty values", () => {
    expect(hydrantExportFilters({ rvStatus: "completed", reviewed: true, coordinates: "", flowMin: 2 }))
      .toEqual({ rvStatus: "completed", reviewed: true, flowMin: 2 });
  });

  it("accepts a safe backend filename and rejects path injection", () => {
    expect(exportFilename('attachment; filename="DDR001_revisiones_2026-08-27.csv"', "fallback.csv"))
      .toBe("DDR001_revisiones_2026-08-27.csv");
    expect(exportFilename('attachment; filename="../../secret.csv"', "fallback.csv")).toBe("fallback.csv");
  });

  it("downloads and releases the object URL", () => {
    const click = vi.fn(), revokeUrl = vi.fn();
    saveExportBlob(new Blob(["ok"]), "file.csv", {
      createUrl: () => "blob:test",
      revokeUrl,
      click,
      schedule: (callback) => { callback(); return 1; },
    });
    expect(click).toHaveBeenCalledWith("blob:test", "file.csv");
    expect(revokeUrl).toHaveBeenCalledWith("blob:test");
  });
});
