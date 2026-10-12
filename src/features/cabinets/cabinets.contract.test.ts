import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client";
import { cabinetsApi, cabinetsRoot } from "./cabinets.api";
import { assertContract } from "./cabinets.contract";
import fixture from "../../../tests/fixtures/cabinets.json";
vi.mock("@/api/client", () => ({ api: { get: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe("Cabinets real administrative contract", () => {
  it.each([
    ["CabinetAdminSummary", "summary"],
    ["CabinetAdminMetrics", "metrics"],
    ["CabinetAdminList", "list"],
    ["CabinetAdminDossier", "dossier"],
    ["CabinetAdminMap", "map"],
    ["CabinetAdminPhoto", "photo"],
  ] as const)(
    "accepts the pinned %s fixture and rejects incompatible required fields",
    (schema, key) => {
      expect(assertContract(schema, fixture[key])).toEqual(fixture[key]);
      const invalid = { ...fixture[key] } as Record<string, unknown>;
      delete invalid[Object.keys(invalid)[0]!];
      expect(() => assertContract(schema, invalid)).toThrow(
        "CABINETS_CONTRACT_DRIFT",
      );
    },
  );
  it("rejects new incompatible status enums, counts, pages, checklist and integrity states", () => {
    expect(() =>
      assertContract("CabinetAdminRow", {
        ...fixture.row,
        status: "delivered",
      }),
    ).toThrow();
    expect(() =>
      assertContract("CabinetAdminSummary", {
        ...fixture.summary,
        total: null,
      }),
    ).toThrow();
    expect(() =>
      assertContract("CabinetAdminList", { ...fixture.list, totalPages: "2" }),
    ).toThrow();
    expect(() =>
      assertContract("CabinetAdminMap", {
        ...fixture.map,
        layer: "construction",
      }),
    ).toThrow();
    expect(() =>
      assertContract("CabinetAdminPhoto", {
        ...fixture.photo,
        integrity: { ...fixture.photo.integrity, status: "synchronized" },
      }),
    ).toThrow();
    const dossier = structuredClone(fixture.dossier);
    dossier.installation.checklist[0]!.answer.answer = "pass";
    expect(() => assertContract("CabinetAdminDossier", dossier)).toThrow();
  });
  it("preserves null base, company, dates, cycles and lastCapture without invented defaults", () => {
    const row = {
      ...fixture.row,
      base: null,
      crew: null,
      location: null,
      registeredAt: null,
      deliverableAt: null,
    };
    expect(assertContract("CabinetAdminRow", row)).toEqual(row);
    expect(assertContract("CabinetAdminMetrics", fixture.metrics)).toEqual(
      fixture.metrics,
    );
    expect(fixture.dossier.pieces.instances[1]!.lastCapture).toBeNull();
  });
  it("uses the seven administrative GET contracts without envelopes or detail-per-row requests", async () => {
    const params = {
      automated: "false",
      search: "AQ26-00001-7",
      page: 2,
      pageSize: 10,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: fixture.list });
    await expect(cabinetsApi.list(params)).resolves.toEqual(fixture.list);
    expect(api.get).toHaveBeenLastCalledWith(cabinetsRoot, {
      params,
      signal: undefined,
    });
    vi.mocked(api.get).mockResolvedValueOnce({ data: fixture.summary });
    await cabinetsApi.summary();
    vi.mocked(api.get).mockResolvedValueOnce({ data: fixture.metrics });
    await cabinetsApi.metrics();
    vi.mocked(api.get).mockResolvedValueOnce({ data: fixture.dossier });
    await cabinetsApi.detail(fixture.row.cabinetId);
    vi.mocked(api.get).mockResolvedValueOnce({ data: fixture.map });
    await cabinetsApi.map({
      limit: 25,
      north: 23,
      south: 21,
      west: -103,
      east: -101,
    });
    vi.mocked(api.get).mockResolvedValue({ data: new Blob() });
    await cabinetsApi.photo(fixture.photo.thumbnailUrl);
    await cabinetsApi.photo(fixture.photo.contentUrl);
    expect(api.get).toHaveBeenCalledTimes(7);
    expect(api.get).toHaveBeenLastCalledWith(
      fixture.photo.contentUrl.slice("/api/v1".length),
      { responseType: "blob", signal: undefined },
    );
  });
  it.each([
    "https://evil.invalid/photo",
    "//evil.invalid/photo",
    "/storage/private.jpg",
    "/api/v1/admin/dashboard/other/photo",
  ])("refuses untrusted photo URL %s", async (url) => {
    await expect(cabinetsApi.photo(url)).rejects.toThrow();
    expect(api.get).not.toHaveBeenCalled();
  });
});
