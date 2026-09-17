import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/client";
import fixture from "../../../tests/fixtures/functional-diagnostics.json";
import {
  diagnosticsApi as service,
  diagnosticsRoot as root,
} from "./diagnostics.api.datasource";
import { date, number, utcDateRange } from "./diagnostics.format";
vi.mock("@/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  problemMessage: () => "Error",
}));
beforeEach(() => vi.clearAllMocks());
const page = (items: unknown[]) => ({
  items,
  page: { limit: 25, nextCursor: "opaque-cursor", sort: "createdAtDesc" },
});
describe("audited diagnostics data source", () => {
  it("unwraps summary and excludes simulation explicitly", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: fixture.summary } });
    expect(await service.summary()).toEqual(fixture.summary);
    expect(api.get).toHaveBeenCalledWith(
      root + "/summary",
      expect.objectContaining({ params: { simulation: "exclude" } }),
    );
  });
  it("forwards filters and opaque cursors unchanged; never sends page/pageSize", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: page([fixture.caseItem]) },
    });
    const filters = {
      query: "METER",
      cursor: "opaque-cursor",
      simulation: "only" as const,
      q: "Q1" as const,
      measurementSource: "BLE" as const,
      limit: 50,
      sort: "meterIdAsc" as const,
    };
    expect((await service.cases(filters)).page.nextCursor).toBe(
      "opaque-cursor",
    );
    expect(api.get).toHaveBeenCalledWith(
      root + "/cases",
      expect.objectContaining({ params: filters }),
    );
  });
  it("adapts embedded reviews and reports without losing the sample tree", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: fixture.detail } });
    const detail = await service.detail(fixture.caseItem.caseId);
    expect(detail.reviews[0]).toMatchObject(fixture.review);
    expect(detail.reports[0]).toMatchObject(fixture.report);
    expect(
      detail.flowPoints[0]?.samples[0]?.operationalSettings?.bleDeviceName,
    ).toBe("ESP32 Contract");
    expect(detail.flowPoints[0]?.sampleStddevPct).toBe(0);
    expect(detail.flowPoints).toHaveLength(4);
  });
  it.each(["metrics", "trends", "users", "reports"] as const)(
    "uses the audited %s namespace",
    async (name) => {
      vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
      await service[name]();
      expect(api.get).toHaveBeenCalledWith(
        root + "/" + name,
        expect.any(Object),
      );
    },
  );
  it("forces UTC trends and explicit simulation policy", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: fixture.trends } });
    await service.trends({
      metric: "meanErrorPct",
      simulation: "include",
      groupBy: "month",
    });
    expect(api.get).toHaveBeenCalledWith(
      root + "/trends",
      expect.objectContaining({
        params: {
          metric: "meanErrorPct",
          simulation: "include",
          groupBy: "month",
          timezone: "UTC",
        },
      }),
    );
  });
  it.each(["access", "accessHistory", "reviews", "report"] as const)(
    "reads %s",
    async (name) => {
      vi.mocked(api.get).mockResolvedValue({ data: { data: fixture.access } });
      await service[name]("uuid");
      expect(api.get).toHaveBeenCalledOnce();
    },
  );
  it("sends nullable rowVersion and the exact review id", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { data: fixture.access } });
    vi.mocked(api.post).mockResolvedValue({ data: { data: fixture.review } });
    const command = {
      accessEnabled: false,
      reason: "Audited reason",
      expectedRowVersion: null,
    };
    await service.updateAccess("user", command);
    expect(api.put).toHaveBeenCalledWith(root + "/users/user/access", command);
    const review = {
      reviewId: "uuid",
      status: "REVIEWED" as const,
      classification: null,
      flags: [],
      comment: null,
    };
    await service.createReview("case", review);
    expect(api.post).toHaveBeenCalledWith(root + "/cases/case/reviews", review);
  });
  it("requests blobs with authentication through the shared client", async () => {
    const blob = new Blob(["image"]);
    vi.mocked(api.get).mockResolvedValue({ data: blob });
    expect(await service.evidence("case", "evidence", "thumbnail")).toBe(blob);
    expect(api.get).toHaveBeenCalledWith(
      root + "/cases/case/evidence/evidence/thumbnail",
      expect.objectContaining({ responseType: "blob" }),
    );
  });
  it("propagates failures without generating fallback data", async () => {
    const error = new Error("API unavailable");
    vi.mocked(api.get).mockRejectedValue(error);
    await expect(service.summary()).rejects.toBe(error);
  });
  it("preserves precision, zero, timestamps and unavailable values", () => {
    expect(number("0", "L", true)).toBe("0 L");
    expect(number("10.123456789", "L", true)).toBe("10.123456789 L");
    expect(number(null)).toBe("No disponible");
    expect(number(NaN)).toBe("No disponible");
    expect(date("bad")).toBe("No disponible");
    expect(utcDateRange("2026-09-02", "2026-09-02")).toEqual({
      from: "2026-09-02T07:00:00.000Z",
      to: "2026-09-03T07:00:00.000Z",
    });
  });
});
