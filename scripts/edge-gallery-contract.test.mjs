import { describe, expect, it } from "vitest";
import { matchesGallerySearch } from "./edge-gallery-contract.mjs";

describe("gallery global search contract", () => {
  const item = {
    accountNumber: "H-002",
    technicianName: "Ana López",
    crewName: "Cuadrilla Norte",
    slotLabel: "Frente cerrado",
    slotCode: "front_closed",
  };

  it.each([
    "002",
    "ANA",
    "norte",
    "Frente",
    "FRONT_CLOSED",
  ])("matches searchable field %s without case sensitivity", (term) => {
    expect(matchesGallerySearch(item, term)).toBe(true);
  });

  it("rejects a term absent from every searchable field", () => {
    expect(matchesGallerySearch(item, "inexistente")).toBe(false);
  });
});
