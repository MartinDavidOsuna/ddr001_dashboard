import { describe, expect, it } from "vitest";
import type { LocationQuery } from "vue-router";
import {
  canReadCabinets,
  labels,
  label,
  cycle,
  displayModel,
  presence,
  text,
  cabinetError,
} from "./cabinets.format";
import {
  readQuery,
  writeQuery,
  filterParams,
  validateQuery,
} from "./cabinets.query";
describe("Cabinet labels, permissions and null presentation", () => {
  it.each(Object.entries(labels))(
    "labels %s as %s without a second state machine",
    (code, expected) => expect(label(code)).toBe(expected),
  );
  it.each([
    ["admin", true],
    ["supervisor", true],
    ["viewer", false],
    ["resident", false],
    [undefined, false],
  ] as const)("authorizes %s = %s", (role, expected) =>
    expect(canReadCabinets(role)).toBe(expected),
  );
  it("does not label deliverable as delivered and preserves textual serials", () => {
    expect(label("deliverable")).toBe("Hidrante entregable");
    expect(text("000ABC007")).toBe("000ABC007");
    expect(
      displayModel({ displayModel: "A3-A", model: "A3", automated: true }),
    ).toBe("A3-A");
    expect(displayModel({ model: "A1", automated: false })).toBe("A1");
    expect(text(null)).toBe("—");
    expect(text(undefined)).toBe("—");
    expect(presence(null)).toBe("—");
    expect(label(null)).toBe("—");
  });
  it.each([
    [null, "Sin datos suficientes"],
    [undefined, "Sin datos suficientes"],
    [NaN, "Sin datos suficientes"],
    [0, "0 s"],
    [47, "47 s"],
    [600, "10.0 min"],
    [7200, "2.0 horas"],
    [172800, "2.0 días"],
  ] as const)("formats cycle %s", (seconds, expected) =>
    expect(cycle(seconds)).toBe(expected),
  );
  it.each([400, 401, 403, 404, 409, 422, 503, 500])(
    "localizes HTTP %s without leaking server detail",
    (status) => {
      const message = cabinetError({
        isAxiosError: true,
        response: { status, data: { detail: "PRIVATE STACK SQL PATH" } },
      });
      expect(message).not.toContain("PRIVATE");
      expect(message).not.toContain("Sin conexión");
      if (status === 503)
        expect(message).toContain("no está disponible o actualizado");
    },
  );
});
describe("URL filters and server-side pagination", () => {
  it("round-trips every shared filter and preserves automated false", () => {
    const q = {
      search: "AQ26-00001-7",
      uid: "AQ26000017",
      accountNumber: "0000123",
      status: "installed",
      model: "A3",
      automated: "false",
      crewId: "00000000-0000-4000-8000-000000000001",
      baseSurveyId: "00000000-0000-4000-8000-000000000002",
      from: "2026-10-01",
      to: "2026-10-12",
      page: "3",
      pageSize: "10",
    };
    const state = readQuery(q);
    expect(writeQuery(state.filters, state.page, state.pageSize)).toEqual(q);
    expect(filterParams(state.filters)).toMatchObject({
      automated: "false",
      accountNumber: "0000123",
      from: "2026-10-01T07:00:00.000Z",
      to: "2026-10-13T07:00:00.000Z",
    });
    expect(validateQuery(state.filters)).toBe("");
  });
  it.each(["AQ26000017", "AQ26-00001-7"])(
    "accepts UID %s as received by API",
    (uid) => expect(validateQuery(readQuery({ uid }).filters)).toBe(""),
  );
  it("uses inclusive from/exclusive end of selected day, including leap month boundaries", () => {
    expect(
      filterParams(readQuery({ from: "2024-02-29", to: "2024-02-29" }).filters),
    ).toMatchObject({
      from: "2024-02-29T07:00:00.000Z",
      to: "2024-03-01T07:00:00.000Z",
    });
  });
  it("sanitizes page bounds and ignores unknown query keys", () => {
    expect(
      readQuery({ page: "-1", pageSize: "101", other: "x" }),
    ).toMatchObject({ page: 1, pageSize: 25 });
    expect(filterParams(readQuery({}).filters)).toEqual({});
  });
  it.each<LocationQuery>([
    { status: "delivered" },
    { model: "A1-A" },
    { automated: "0" },
    { crewId: "bad" },
    { baseSurveyId: "bad" },
    { uid: "bad" },
    { from: "bad" },
    { from: "2026-02-30" },
    { from: "2026-10-12", to: "2026-10-01" },
  ])("rejects invalid filters %s", (query) =>
    expect(validateQuery(readQuery(query).filters)).not.toBe(""),
  );
});
