import type { HydrantFilters, InspectionFilters } from "@/api/types";

export type ExportSelection =
  | "inspections-xlsx"
  | "inspections-csv"
  | "hydrants-xlsx";

export type InspectionExportFilters = Omit<InspectionFilters, "page" | "pageSize">;
export type HydrantExportFilters = Omit<HydrantFilters, "page" | "pageSize">;

export function exportRequest(
  selection: ExportSelection,
  inspectionFilters: InspectionExportFilters,
  hydrantFilters: HydrantExportFilters,
) {
  if (selection === "inspections-csv")
    return {
      path: "/admin/dashboard/exports/inspections.csv",
      params: inspectionFilters,
      fallback: "DDR001_revisiones.csv",
    };
  if (selection === "hydrants-xlsx")
    return {
      path: "/admin/dashboard/exports/hydrants.xlsx",
      params: hydrantFilters,
      fallback: "DDR001_hidrantes.xlsx",
    };
  return {
    path: "/admin/dashboard/exports/inspections.xlsx",
    params: { ...inspectionFilters, appBaseUrl: window.location.origin },
    fallback: "DDR001_revisiones.xlsx",
  };
}

export function exportFilename(disposition: unknown, fallback: string) {
  const candidate = String(disposition || "").match(/filename="?([^";]+)"?/i)?.[1];
  return candidate && /^[\p{L}\p{N}_.-]+$/u.test(candidate)
    ? candidate
    : fallback;
}

export function saveExportBlob(
  blob: Blob,
  filename: string,
  adapters = {
    createUrl: (value: Blob) => URL.createObjectURL(value),
    revokeUrl: (url: string) => URL.revokeObjectURL(url),
    click: (url: string, name: string) => {
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
    },
    schedule: (callback: () => void) => window.setTimeout(callback, 1_000),
  },
) {
  const url = adapters.createUrl(blob);
  adapters.click(url, filename);
  adapters.schedule(() => adapters.revokeUrl(url));
}

export function inspectionExportFilters(source: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of ["search", "userId", "crewId", "status", "gps"])
    if (source[key] !== "" && source[key] !== undefined) result[key] = source[key];
  if (source.from) result.from = new Date(`${source.from}T00:00:00-07:00`).toISOString();
  if (source.to) {
    const end = new Date(`${source.to}T00:00:00-07:00`);
    end.setDate(end.getDate() + 1);
    result.to = end.toISOString();
  }
  return result as InspectionExportFilters;
}

export function hydrantExportFilters(source: Record<string, unknown>) {
  const result = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== "" && value !== undefined),
  ) as Record<string, unknown>;
  if (typeof result.lastFrom === "string" && result.lastFrom.length === 10)
    result.lastFrom = `${result.lastFrom}T00:00:00.000Z`;
  if (typeof result.lastTo === "string" && result.lastTo.length === 10)
    result.lastTo = `${result.lastTo}T00:00:00.000Z`;
  return result as HydrantExportFilters;
}
