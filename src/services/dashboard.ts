import { api } from "@/api/client";
import type {
  DashboardSummary,
  FilterOption,
  GalleryFilters,
  GalleryPhoto,
  HydrantFilters,
  HydrantInspectionHistoryItem,
  HydrantMasterRecord,
  InspectionDetail,
  InspectionFilters,
  InspectionListItem,
  Page,
  PhotoSlotOption,
} from "@/api/types";
export const dashboardService = {
  async summary() {
    return (await api.get<DashboardSummary>("/admin/dashboard/summary")).data;
  },
  async filters() {
    return (
      await api.get<{
        technicians: FilterOption[];
        crews: FilterOption[];
        statuses: string[];
      }>("/admin/dashboard/filters")
    ).data;
  },
  async inspections(filters: InspectionFilters) {
    return (
      await api.get<Page<InspectionListItem>>("/admin/dashboard/inspections", {
        params: filters,
      })
    ).data;
  },
  async inspection(id: string) {
    return (
      await api.get<InspectionDetail>(`/admin/dashboard/inspections/${id}`)
    ).data;
  },
  async hydrants(filters: HydrantFilters) {
    return (
      await api.get<Page<HydrantMasterRecord>>("/admin/dashboard/hydrants", {
        params: filters,
      })
    ).data;
  },
  async hydrant(id: string) {
    return (
      await api.get<HydrantMasterRecord>(`/admin/dashboard/hydrants/${id}`)
    ).data;
  },
  async hydrantInspections(id: string, page = 1, pageSize = 25) {
    return (
      await api.get<Page<HydrantInspectionHistoryItem>>(
        `/admin/dashboard/hydrants/${id}/inspections`,
        { params: { page, pageSize } },
      )
    ).data;
  },
  async photo(url: string) {
    return URL.createObjectURL(
      (await api.get<Blob>(url, { responseType: "blob", timeout: 30_000 }))
        .data,
    );
  },
  async gallery(filters: GalleryFilters) {
    return (
      await api.get<Page<GalleryPhoto>>("/admin/dashboard/photos", {
        params: filters,
      })
    ).data;
  },
  async galleryFilters() {
    return (
      await api.get<{ slots: PhotoSlotOption[] }>(
        "/admin/dashboard/photos/filters",
      )
    ).data;
  },
  async exportInspections() {
    const response = await api.get<Blob>(
      "/admin/dashboard/exports/inspections.xlsx",
      {
        params: { appBaseUrl: window.location.origin },
        responseType: "blob",
        timeout: 120_000,
      },
    );
    const disposition = String(response.headers["content-disposition"] || "");
    const filename =
      disposition.match(/filename="?([^";]+)"?/i)?.[1] ||
      "revisiones-ddr001.xlsx";
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  },
};
