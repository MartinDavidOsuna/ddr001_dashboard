import type { MapItem } from "./map.types";
export const CLUSTER_RADIUS_PX = 0.2734375;
export const HYDRANT_MERGE_METERS = 4;
const radius = 6371008.8;
// Earth-centred grid avoids latitude/date-line distortion. Adjacent cells are sufficient
// for a strict <4 m chord search. Connected components preserve every original record.
export function groupNearbyHydrants(items: MapItem[]): MapItem[] {
  const hydrants = items
    .filter((i) => i.domain === "hydrants")
    .sort((a, b) => a.key.localeCompare(b.key));
  const parent = hydrants.map((_, i) => i);
  const root = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const points: number[][] = [];
  const cells = new Map<string, number[]>();
  // One nanometre tolerance prevents floating-point rounding from merging exactly 4 m.
  const threshold = 2 * radius * Math.sin(HYDRANT_MERGE_METERS / (2 * radius));
  for (const [i, item] of hydrants.entries()) {
    const lat = (item.latitude * Math.PI) / 180,
      lon = (item.longitude * Math.PI) / 180;
    const point = [
      radius * Math.cos(lat) * Math.cos(lon),
      radius * Math.cos(lat) * Math.sin(lon),
      radius * Math.sin(lat),
    ];
    points.push(point);
    const cell = point.map((v) => Math.floor(v / HYDRANT_MERGE_METERS));
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          for (const j of cells.get(
            `${cell[0]! + x},${cell[1]! + y},${cell[2]! + z}`,
          ) || []) {
            if (
              Math.hypot(...point.map((v, k) => v - points[j]![k]!)) <
              threshold - 1e-9
            )
              parent[root(i)] = root(j);
          }
        }
    const key = cell.join(",");
    cells.set(key, [...(cells.get(key) || []), i]);
  }
  const groups = new Map<number, MapItem[]>();
  hydrants.forEach((item, i) => {
    const key = root(i);
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.values()]
    .map((members) => {
      const first = members[0]!;
      if (members.length === 1) return first;
      const mixed = members.some((i) => i.statusCode !== first.statusCode);
      return {
        ...first,
        members,
        statusCode: mixed ? "mixed" : first.statusCode,
        status: mixed ? "Estados distintos" : first.status,
      };
    })
    .concat(items.filter((i) => i.domain !== "hydrants"));
}
