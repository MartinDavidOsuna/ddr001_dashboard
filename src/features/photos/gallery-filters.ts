import type { GalleryFilters } from "@/api/types";

export interface GalleryFilterState {
  page: number;
  pageSize: number;
  search: string;
  slotCode: string;
  category: string;
  technicianId: string;
  crewId: string;
  uploadStatus: string;
  from: string;
  to: string;
}

const operationalOffset = "-07:00";

export function toGalleryApiFilters(
  filters: GalleryFilterState,
): GalleryFilters {
  const values: GalleryFilters = {
    page: filters.page,
    pageSize: filters.pageSize,
  };
  if (filters.search) values.search = filters.search;
  if (filters.slotCode) values.slotCode = filters.slotCode;
  if (filters.category)
    values.category = filters.category as GalleryFilters["category"];
  if (filters.technicianId) values.technicianId = filters.technicianId;
  if (filters.crewId) values.crewId = filters.crewId;
  if (filters.uploadStatus)
    values.uploadStatus =
      filters.uploadStatus as GalleryFilters["uploadStatus"];
  if (filters.from)
    values.from = new Date(
      `${filters.from}T00:00:00${operationalOffset}`,
    ).toISOString();
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00${operationalOffset}`);
    end.setUTCDate(end.getUTCDate() + 1);
    values.to = end.toISOString();
  }
  return values;
}
