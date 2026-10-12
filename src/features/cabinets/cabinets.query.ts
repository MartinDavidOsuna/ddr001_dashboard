import type { LocationQuery, LocationQueryRaw } from "vue-router";
import { utcDateRange } from "@/features/diagnostics/diagnostics.format";
import type { CabinetParams } from "./cabinets.api";
import { models, statuses } from "./cabinets.format";
export const filterKeys = [
  "search",
  "uid",
  "accountNumber",
  "status",
  "model",
  "automated",
  "crewId",
  "baseSurveyId",
  "from",
  "to",
] as const;
export type CabinetFilters = Record<(typeof filterKeys)[number], string>;
export function readQuery(query: LocationQuery) {
  const filters = Object.fromEntries(
    filterKeys.map((k) => [k, typeof query[k] === "string" ? query[k] : ""]),
  ) as CabinetFilters;
  const integer = (key: string, fallback: number, max: number) => {
    const value = Number(query[key]);
    return Number.isInteger(value) && value > 0 && value <= max
      ? value
      : fallback;
  };
  return {
    filters,
    page: integer("page", 1, 100000),
    pageSize: integer("pageSize", 25, 100),
  };
}
export function writeQuery(
  filters: CabinetFilters,
  page = 1,
  pageSize = 25,
): LocationQueryRaw {
  return {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    page: String(page),
    pageSize: String(pageSize),
  };
}
export function filterParams(filters: CabinetFilters): CabinetParams {
  const { from, to, ...rest } = filters;
  return {
    ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== "")),
    ...utcDateRange(from, to),
  };
}
export function validateQuery(filters: CabinetFilters) {
  if (filters.from && filters.to && filters.from > filters.to)
    return "La fecha final debe ser igual o posterior a la inicial.";
  if (
    filters.status &&
    !statuses.includes(filters.status as (typeof statuses)[number])
  )
    return "Estado inválido.";
  if (
    filters.model &&
    !models.includes(filters.model as (typeof models)[number])
  )
    return "Modelo inválido.";
  if (filters.automated && !["true", "false"].includes(filters.automated))
    return "Variante inválida.";
  for (const key of ["baseSurveyId", "crewId"] as const)
    if (
      filters[key] &&
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        filters[key],
      )
    )
      return "El identificador de base o empresa no es válido.";
  if (filters.uid && !/^AQ(?:\d{8}|\d{2}-\d{5}-\d)$/.test(filters.uid))
    return "UID inválido.";
  for (const key of ["from", "to"] as const)
    if (
      filters[key] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(filters[key]) ||
        Number.isNaN(Date.parse(filters[key])) ||
        new Date(filters[key]).toISOString().slice(0, 10) !== filters[key])
    )
      return "Fecha inválida.";
  return "";
}
