import { describe, it, expect } from "vitest";
import { groupNearbyHydrants, CLUSTER_RADIUS_PX } from "./map.grouping";
import { statusStyle, legendEntries } from "./map.colors";
import { markerIcon } from "./map.markers";
import type { MapItem } from "./map.types";
const item = (id: string, meters = 0, code = "pending"): MapItem => ({
  key: `hydrants:${id}`,
  id,
  domain: "hydrants",
  title: id,
  status: code,
  statusCode: code,
  latitude: ((meters / 6371008.8) * 180) / Math.PI,
  longitude: 0,
  href: `/hidrantes/${id}`,
  simulation: false,
  details: [],
});
describe("geographic aggregation", () => {
  it("halves pixel clustering again independently of the physical distance rule", () =>
    expect(CLUSTER_RADIUS_PX).toBe(8.75));
  it("merges exact overlaps and under 4 metres, but keeps 4+ metres separate", () => {
    for (const distance of [0, 3.999])
      expect(
        groupNearbyHydrants([item("a"), item("b", distance)]),
      ).toHaveLength(1);
    for (const distance of [4, 4.001, 5, 100])
      expect(
        groupNearbyHydrants([item("a"), item("b", distance)]),
      ).toHaveLength(2);
  });
  it("preserves deterministic real coordinates, all accounts and mixed states", () => {
    const a = item("a"),
      b = item("b", 3, "completed");
    expect(groupNearbyHydrants([b, a])).toEqual(groupNearbyHydrants([a, b]));
    const group = groupNearbyHydrants([b, a])[0]!;
    expect(group.latitude).toBe(a.latitude);
    expect(group.members).toEqual([a, b]);
    expect(group.statusCode).toBe("mixed");
    expect(markerIcon(group).options.html).toContain("map-pin-count");
  });
  it("does not merge domains or lose chained neighbours", () => {
    const diagnostic = { ...item("d"), domain: "diagnostics" as const };
    const grouped = groupNearbyHydrants([
      item("a"),
      item("b", 3),
      item("c", 6),
      diagnostic,
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]!.members).toHaveLength(3);
  });
  it("handles date line and polar coordinates", () => {
    const a = { ...item("a"), longitude: 179.99999 },
      b = { ...item("b"), longitude: -179.99999 };
    expect(groupNearbyHydrants([a, b])).toHaveLength(1);
    expect(
      groupNearbyHydrants([
        { ...a, latitude: 89.99999, longitude: 0 },
        { ...b, latitude: 89.99999, longitude: 180 },
      ]),
    ).toHaveLength(1);
  });
  it("scales to the response limit and keeps every original record", () => {
    const input = Array.from({ length: 2000 }, (_, i) =>
      item(String(i), i * 5),
    );
    expect(groupNearbyHydrants(input)).toHaveLength(2000);
  });
});
describe("status palette", () => {
  it("differentiates states and safely falls back for unknown values", () => {
    expect(statusStyle(item("a")).color).not.toBe(
      statusStyle(item("b", 0, "completed")).color,
    );
    expect(statusStyle(item("a", 0, "<script>")).color).toBe("#64748b");
    expect(markerIcon(item("a", 0, "<script>")).options.html).not.toContain(
      "<script>",
    );
  });
  it("identifies conflicts reported by the live RV API", () => {
    expect(statusStyle(item("a", 0, "conflict"))).toEqual({
      label: "En conflicto",
      color: "#c2410c",
    });
  });
  it("keeps legend scoped to actual visible domain states", () => {
    const entries = legendEntries(
      [item("a"), { ...item("d", 0, "RECHAZADO"), domain: "diagnostics" }],
      "hydrants",
    );
    expect(entries.map((e) => e.key)).toEqual(["pending"]);
  });
});
