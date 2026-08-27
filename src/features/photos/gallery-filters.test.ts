import { describe, expect, it } from "vitest";
import { toGalleryApiFilters, type GalleryFilterState } from "./gallery-filters";

const empty: GalleryFilterState = {
  page: 1,
  pageSize: 40,
  search: "",
  slotCode: "",
  category: "",
  technicianId: "",
  crewId: "",
  uploadStatus: "",
  from: "",
  to: "",
};

describe("gallery filters", () => {
  it("omits empty optional filters", () => {
    expect(toGalleryApiFilters(empty)).toEqual({ page: 1, pageSize: 40 });
  });

  it("maps every supported server-side filter", () => {
    expect(
      toGalleryApiFilters({
        ...empty,
        page: 2,
        pageSize: 80,
        search: "H-100",
        slotCode: "front_closed",
        category: "mandatory",
        technicianId: "technician-id",
        crewId: "crew-id",
        uploadStatus: "verified",
        from: "2026-08-01",
        to: "2026-08-26",
      }),
    ).toEqual({
      page: 2,
      pageSize: 80,
      search: "H-100",
      slotCode: "front_closed",
      category: "mandatory",
      technicianId: "technician-id",
      crewId: "crew-id",
      uploadStatus: "verified",
      from: "2026-08-01T07:00:00.000Z",
      to: "2026-08-27T07:00:00.000Z",
    });
  });
});
