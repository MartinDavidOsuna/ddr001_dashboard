import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client";
import { cabinetsApi, cabinetsRoot } from "./cabinets.api";
import { assertContract } from "./cabinets.contract";
import fixture from "../../../tests/fixtures/cabinets.json";
vi.mock("@/api/client", () => ({ api: { get: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe("Cabinets real administrative contract", () => {
  const event = {
    audit_id: "9007199254740993",
    actor_id: null,
    actorName: null,
    action: "cabinet.admin.edit",
    before_json: null,
    after_json: "{}",
    occurred_at: "2026-10-28T12:00:00.000Z",
  };
  it.each([
    "0",
    "9007199254740993",
    "9223372036854775807",
    "-9223372036854775808",
  ])(
    "accepts exact SQL BIGINT decimal %s without numeric coercion",
    (audit_id) => {
      const value = {
        ...structuredClone(fixture.dossier),
        administrativeHistory: [{ ...event, audit_id }],
      };
      expect(assertContract("CabinetAdminDossier", value)).toEqual(value);
    },
  );
  it.each([
    1,
    null,
    {},
    [],
    "",
    "01",
    "-0",
    "+1",
    "1.5",
    "1e3",
    " 1",
    "1 ",
    "9223372036854775808",
    "-9223372036854775809",
    "11111111-1111-4111-8111-111111111111",
  ])(
    "rejects corrupt administrative audit ID %j with its exact field",
    (audit_id) => {
      const value = {
        ...structuredClone(fixture.dossier),
        administrativeHistory: [{ ...event, audit_id }],
      };
      expect(() => assertContract("CabinetAdminDossier", value)).toThrow(
        expect.objectContaining({
          field: "$response.administrativeHistory[0].audit_id",
        }),
      );
    },
  );
  it.each([
    "actor_id",
    "actorName",
    "before_json",
    "after_json",
    "occurred_at",
    "action",
  ])("continues rejecting corrupt history field %s", (field) => {
    const value = {
      ...structuredClone(fixture.dossier),
      administrativeHistory: [{ ...event, [field]: { invalid: true } }],
    };
    expect(() => assertContract("CabinetAdminDossier", value)).toThrow(
      expect.objectContaining({
        field: `$response.administrativeHistory[0].${field}`,
      }),
    );
  });
  it("loads empty and multi-event administrative history through the real API client parser", async () => {
    const empty = {
      ...structuredClone(fixture.dossier),
      administrativeHistory: [],
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: empty });
    expect(await cabinetsApi.detail(fixture.row.cabinetId)).toEqual(empty);
    const value = {
      ...empty,
      administrativeHistory: [
        { ...event, action: "cabinet.admin.cancel_installation" },
        { ...event, audit_id: "9007199254740994" },
        {
          ...event,
          audit_id: "9007199254740995",
          action: "cabinet.admin.archive",
        },
      ],
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: value });
    expect(await cabinetsApi.detail(fixture.row.cabinetId)).toEqual(value);
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...value, administrativeHistory: [{ ...event, audit_id: 1 }] },
    });
    await expect(
      cabinetsApi.detail(fixture.row.cabinetId),
    ).rejects.toMatchObject({
      field: "$response.administrativeHistory[0].audit_id",
    });
  });
  it("reopens a dossier with the lossless SQL BIGINT administrative history", () => {
    const value = {
      ...structuredClone(fixture.dossier),
      administrativeHistory: [
        {
          audit_id: "9007199254740993",
          actor_id: null,
          actorName: null,
          action: "cabinet.admin.cancel_installation",
          before_json: null,
          after_json: JSON.stringify({ reason: "Synthetic cancellation" }),
          occurred_at: "2026-10-28T12:00:00.000Z",
        },
      ],
    };
    expect(assertContract("CabinetAdminDossier", value)).toEqual(value);
  });
  it("accepts explicit unknown historical photo GPS but rejects corrupt values", () => {
    const value = structuredClone(fixture.dossier) as unknown as {
      photos: Array<{
        metadata: {
          latitude: number | string | null;
          longitude: number | null;
          accuracy: number | null;
          altitude?: number | null;
        };
      }>;
    };
    Object.assign(value.photos[0]!.metadata, {
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
    });
    expect(assertContract("CabinetAdminDossier", value)).toEqual(value);
    value.photos[0]!.metadata.latitude = "invalid";
    expect(() => assertContract("CabinetAdminDossier", value)).toThrow(
      "CABINETS_CONTRACT_DRIFT",
    );
  });
  it("accepts persisted v1 history without universal parts and requires them for v2", () => {
    const value = structuredClone(fixture.dossier) as unknown as {
      history: Array<{
        cabinet: {
          partsReviewPolicy: {
            version: string;
            evidenceRequired: boolean;
            parts: object;
            universalParts?: object[];
          };
        };
      }>;
    };
    const policy = {
      version: "ddr001-parts-20261019-v1",
      evidenceRequired: false,
      parts: { historical: { side: "district", order: 1, serial: "none" } },
    };
    value.history[0]!.cabinet.partsReviewPolicy = policy;
    expect(assertContract("CabinetAdminDossier", value)).toEqual(value);
    policy.version = "ddr001-parts-20261019-v2";
    expect(() => assertContract("CabinetAdminDossier", value)).toThrow(
      "CABINETS_CONTRACT_DRIFT",
    );
    value.history[0]!.cabinet.partsReviewPolicy.universalParts = [];
    expect(() => assertContract("CabinetAdminDossier", value)).toThrow(
      "CABINETS_CONTRACT_DRIFT",
    );
    Object.assign(policy.parts.historical, { step: "district" });
    expect(assertContract("CabinetAdminDossier", value)).toEqual(value);
    policy.version = "unknown-future-policy";
    expect(() => assertContract("CabinetAdminDossier", value)).toThrow(
      "CABINETS_CONTRACT_DRIFT",
    );
  });
  it("accepts a historical base with unknown GPS accuracy without weakening installation captures", () => {
    const value = structuredClone(fixture.list) as unknown as {
      items: Array<{ base: { location: { accuracy: number | null } } }>;
    };
    value.items[0]!.base.location.accuracy = null;
    expect(assertContract("CabinetAdminList", value)).toEqual(value);
    const invalid = structuredClone(fixture.dossier) as unknown as {
      installation: { data: { gps: { accuracy: number | null } } };
    };
    invalid.installation.data.gps.accuracy = null;
    expect(() => assertContract("CabinetAdminDossier", invalid)).toThrow(
      "CABINETS_CONTRACT_DRIFT",
    );
  });
  it.each(["linked_base", "registration_profile", "session_history_consensus"])(
    "accepts real company source %s while preserving pagination and null historical values",
    (source) => {
      const value = structuredClone(fixture.list);
      value.items[0]!.crew = { ...fixture.row.crew, source };
      expect(assertContract("CabinetAdminList", value)).toEqual(value);
    },
  );
  it("reports the incompatible field without returning an empty list", () => {
    const value = structuredClone(fixture.list);
    value.items[0]!.crew = { ...fixture.row.crew, source: "unknown_source" };
    try {
      assertContract("CabinetAdminList", value);
      throw new Error("must reject");
    } catch (error) {
      expect(error).toMatchObject({
        message: "CABINETS_CONTRACT_DRIFT",
        field: "$response.items[0].crew.source",
      });
    }
  });
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
