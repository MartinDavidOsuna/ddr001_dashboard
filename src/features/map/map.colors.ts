import type { Domain, MapItem } from "./map.types";
export const statusColors = {
  pending: { label: "Pendiente", color: "#a16207" },
  completed: { label: "Completado", color: "#15803d" },
  conflict: { label: "En conflicto", color: "#c2410c" },
  draft: { label: "Borrador", color: "#64748b" },
  submitted: { label: "Enviada", color: "#0369a1" },
  validated: { label: "Validada", color: "#15803d" },
  rejected: { label: "Rechazado", color: "#b91c1c" },
  created: { label: "Creado", color: "#64748b" },
  in_progress: { label: "En proceso", color: "#a16207" },
  executed: { label: "Ejecutado", color: "#0369a1" },
  accepted: { label: "Aceptado", color: "#15803d" },
  delivered: { label: "Entregado", color: "#6d28d9" },
  APROBADO: { label: "Aprobado", color: "#15803d" },
  RECHAZADO: { label: "Rechazado", color: "#b91c1c" },
  NO_CONCLUYENTE: { label: "No concluyente", color: "#a16207" },
  unknown: { label: "Sin estado informado", color: "#64748b" },
  mixed: {
    label: "Hidrantes agrupados con estados distintos",
    color: "#334155",
  },
} as const;
export function statusStyle(item: Pick<MapItem, "statusCode">) {
  return Object.hasOwn(statusColors, item.statusCode)
    ? statusColors[item.statusCode as keyof typeof statusColors]
    : statusColors.unknown;
}
export function legendEntries(items: MapItem[], domain: Domain) {
  const counts = new Map<string, number>();
  for (const item of items.filter((i) => i.domain === domain)) {
    const key = Object.hasOwn(statusColors, item.statusCode)
      ? item.statusCode
      : "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.entries(statusColors)
    .filter(([key]) => counts.has(key))
    .map(([key, style]) => ({ key, ...style, count: counts.get(key)! }));
}
