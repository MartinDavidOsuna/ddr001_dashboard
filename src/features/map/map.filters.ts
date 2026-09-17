import type { LocationQuery } from "vue-router";
import {
  domains,
  type Bounds,
  type Domain,
  type Filters,
  type MapView,
} from "./map.types";
import { utcDateRange } from "@/features/diagnostics/diagnostics.format";
export type FilterField = {
  key: string;
  label: string;
  options?: Array<[string, string]>;
  type?: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
};
const options = (values: string[]) =>
  values.map((v) => [v, v] as [string, string]);
export const filterFields: Record<Domain, FilterField[]> = {
  hydrants: [
    {
      key: "rvStatus",
      label: "Estado RV",
      options: [
        ["pending", "Pendiente"],
        ["completed", "Completado"],
      ],
    },
    {
      key: "reviewed",
      label: "Revisión recibida",
      options: [
        ["true", "Revisado"],
        ["false", "Pendiente"],
      ],
    },
    {
      key: "hasInspections",
      label: "Revisiones",
      options: [
        ["true", "Con revisiones"],
        ["false", "Sin revisiones"],
      ],
    },
    {
      key: "installationYear",
      label: "Año de instalación",
      type: "number",
      min: 1900,
      max: 2200,
    },
    {
      key: "flowMin",
      label: "Gasto mínimo (L/s)",
      type: "number",
      min: 0,
      max: 999999999,
      step: "any",
    },
    {
      key: "flowMax",
      label: "Gasto máximo (L/s)",
      type: "number",
      min: 0,
      max: 999999999,
      step: "any",
    },
  ],
  construction: [
    {
      key: "status",
      label: "Estado",
      options: [
        ["created", "Creado"],
        ["in_progress", "En proceso"],
        ["executed", "Ejecutado"],
        ["accepted", "Aceptado"],
        ["rejected", "Rechazado"],
        ["delivered", "Entregado"],
        ["in_process", "Creado o en proceso"],
      ],
    },
    {
      key: "stage",
      label: "Etapa",
      options: [
        "Creación",
        "Preparación del terreno",
        "Cimbrado",
        "Armado",
        "Colado",
        "Descimbrado",
        "Terminado",
      ].map((v, i) => [String(i), v]),
    },
    {
      key: "contractorId",
      label: "Contratista (UUID)",
      placeholder: "Identificador del contratista",
    },
    {
      key: "crewId",
      label: "Empresa / cuadrilla (UUID)",
      placeholder: "Identificador de la empresa",
    },
  ],
  diagnostics: [
    {
      key: "simulation",
      label: "Datos funcionales",
      options: [
        ["exclude", "Reales"],
        ["include", "Reales + simulaciones"],
        ["only", "Sólo simulaciones"],
      ],
    },
    {
      key: "verdict",
      label: "Veredicto",
      options: [
        ["APROBADO", "Aprobado"],
        ["RECHAZADO", "Rechazado"],
        ["NO_CONCLUYENTE", "No concluyente"],
      ],
    },
    {
      key: "status",
      label: "Estado del caso",
      options: [
        ["OPEN", "En proceso"],
        ["CLOSED", "Finalizado"],
      ],
    },
    {
      key: "userId",
      label: "Técnico (UUID)",
      placeholder: "Identificador del técnico",
    },
    {
      key: "measurementSource",
      label: "Fuente de medición",
      options: [
        ["VISUAL", "Visual"],
        ["MANUAL", "Manual"],
        ["LED", "LED"],
        ["BLE", "Bluetooth / ESP32"],
        ["SIMULATION", "Simulación"],
      ],
    },
    { key: "q", label: "Punto Q", options: options(["Q1", "Q2", "Q3", "Q4"]) },
    { key: "testBenchId", label: "Banco de prueba" },
    {
      key: "integrityStatus",
      label: "Integridad",
      options: options([
        "OK",
        "COMPROMISED",
        "VERIFIED",
        "MISMATCH",
        "CORRUPT",
      ]),
    },
    {
      key: "reviewStatus",
      label: "Estado de revisión",
      options: options(["PENDING", "REVIEWED", "FLAGGED", "RESOLVED"]),
    },
    { key: "deviceModel", label: "Modelo de dispositivo" },
  ],
};
export const prefix: Record<Domain, string> = {
  hydrants: "h_",
  construction: "c_",
  diagnostics: "d_",
};
export function readMapQuery(query: LocationQuery): {
  view: MapView;
  filters: Filters;
  layers: Domain[];
} {
  const raw = typeof query.view === "string" ? query.view : "";
  const view: MapView = [...domains, "reviews", "all"].includes(raw)
    ? (raw as MapView)
    : "hydrants";
  const keys = [
    "search",
    "from",
    "to",
    ...domains.flatMap((d) => filterFields[d].map((f) => prefix[d] + f.key)),
  ];
  const filters: Filters = { d_simulation: "exclude" };
  for (const key of keys)
    if (typeof query[key] === "string" && query[key])
      filters[key] = query[key] as string;
  const layers =
    typeof query.layers === "string"
      ? domains.filter((d) => query.layers!.toString().split(",").includes(d))
      : [...domains];
  return { view, filters, layers };
}
export function apiParams(domain: Domain, filters: Filters, bbox?: Bounds) {
  const p: Record<string, string | number> = { limit: 2000, ...bbox };
  for (const field of filterFields[domain]) {
    const v = filters[prefix[domain] + field.key];
    if (v) p[field.key] = v;
  }
  if (domain === "diagnostics")
    p.simulation = filters.d_simulation || "exclude";
  if (filters.search?.trim())
    p[domain === "diagnostics" ? "query" : "search"] = filters.search.trim();
  const dates = utcDateRange(filters.from || "", filters.to || "");
  if (dates.from) p[domain === "hydrants" ? "lastFrom" : "from"] = dates.from;
  if (dates.to) p[domain === "hydrants" ? "lastTo" : "to"] = dates.to;
  return p;
}
export function filterCount(filters: Filters, view: MapView) {
  return Object.entries(filters).filter(
    ([k, v]) =>
      v &&
      !(k === "d_simulation" && v === "exclude") &&
      (["search", "from", "to"].includes(k) ||
        view === "all" ||
        k.startsWith(prefix[view === "reviews" ? "hydrants" : view])),
  ).length;
}
export function validateFilters(f: Filters): string {
  if (f.from && f.to && f.from > f.to)
    return "La fecha final debe ser igual o posterior a la inicial.";
  if (f.search?.trim() && f.search.trim().length < 2)
    return "La búsqueda requiere al menos 2 caracteres.";
  if (f.h_flowMin && f.h_flowMax && Number(f.h_flowMin) > Number(f.h_flowMax))
    return "El gasto mínimo no puede superar al máximo.";
  for (const key of ["c_contractorId", "c_crewId", "d_userId"])
    if (
      f[key] &&
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        f[key]!,
      )
    )
      return "El identificador del técnico, contratista o empresa debe ser un UUID válido.";
  return "";
}
