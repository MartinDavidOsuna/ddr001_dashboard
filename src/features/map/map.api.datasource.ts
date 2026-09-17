import { api } from "@/api/client";
import { date, label } from "@/features/diagnostics/diagnostics.format";
import { apiParams } from "./map.filters";
import type { Bounds, Domain, Filters, MapItem, MapPage } from "./map.types";
export const mapEndpoints: Record<Domain, string> = {
  hydrants: "/admin/dashboard/map/hydrants",
  construction: "/admin/dashboard/construction/map",
  diagnostics: "/admin/dashboard/functional-diagnostics/map",
};
type Row = Record<string, unknown>;
const text = (v: unknown) => (v == null ? "No disponible" : String(v));
const states: Record<string, string> = {
  pending: "Pendiente",
  conflict: "En conflicto",
  completed: "Completado",
  created: "Creado",
  in_progress: "En proceso",
  executed: "Ejecutado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  delivered: "Entregado",
  submitted: "Enviada",
  validated: "Validada",
  draft: "Borrador",
};
export function mapStatus(v: unknown) {
  return states[String(v)] || label(v);
}
export function adaptMapItem(d: Domain, r: Row): MapItem | null {
  if (r.latitude == null || r.longitude == null) return null;
  const latitude = Number(r.latitude),
    longitude = Number(r.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  const id = String(
    r[
      d === "hydrants"
        ? "hydrantId"
        : d === "construction"
          ? "surveyId"
          : "caseId"
    ] || "",
  );
  if (!id) return null;
  const details: Array<[string, string]> =
    d === "hydrants"
      ? [
          ["Cuenta", text(r.accountNumber)],
          ["Estado RV", mapStatus(r.rvStatus)],
          ["Última revisión", date(r.lastInspectionAt)],
          ["Estado de última revisión", mapStatus(r.latestInspectionStatus)],
          ["Técnico", text(r.technicianName)],
          ["Cuadrilla", text(r.crewName)],
          ["Revisiones", text(r.inspectionCount)],
          ["Revisión recibida", r.reviewed ? "Sí" : "No"],
        ]
      : d === "construction"
        ? [
            ["Identificador", text(r.displayIdentifier)],
            ["Cuenta", text(r.accountNumber)],
            ["Estado", mapStatus(r.status)],
            ["Etapa", text(r.currentStep)],
            ["Contratista", text(r.contractorName)],
            ["Empresa / cuadrilla", text(r.crewName)],
            ["Precisión GPS (m)", text(r.accuracy)],
            ["Actualización", date(r.updatedAt)],
          ]
        : [
            ["Medidor", text(r.meterId)],
            ["Veredicto", mapStatus(r.overallVerdict)],
            ["Técnico", text(r.technicianName)],
            ["Creación del caso", date(r.createdAt)],
            ["Banco", text(r.testBenchId)],
            [
              "Fuentes",
              Array.isArray(r.measurementSources)
                ? r.measurementSources.map(label).join(", ")
                : "No disponible",
            ],
            ["Bluetooth / ESP32", r.hasBle ? "Sí" : "No"],
            ["Precisión GPS (m)", text(r.gpsAccuracyM)],
            ["Captura GPS", date(r.gpsCapturedAt)],
            ["Integridad", label(r.integrityStatus)],
            ["Revisión", label(r.reviewStatus)],
            ["Muestra GPS", text(r.sampleId)],
            ["Q del GPS", text(r.flowPointCode)],
            ["Fuente del GPS", label(r.measurementSource)],
            [
              "Muestras / Q",
              `${text(r.sampleCount)} / ${text(r.flowPointCount)}`,
            ],
          ];
  return {
    key: `${d}:${id}`,
    id,
    domain: d,
    latitude,
    longitude,
    details,
    title: text(
      r[
        d === "hydrants"
          ? "accountNumber"
          : d === "construction"
            ? "displayIdentifier"
            : "meterId"
      ],
    ),
    statusCode: String(
      d === "hydrants"
        ? r.rvStatus
        : d === "construction"
          ? r.status
          : r.overallVerdict || "unknown",
    ),
    latestInspectionStatus:
      d === "hydrants"
        ? String(r.latestInspectionStatus || "unknown")
        : undefined,
    status: mapStatus(
      r[
        d === "hydrants"
          ? "rvStatus"
          : d === "construction"
            ? "status"
            : "overallVerdict"
      ],
    ),
    href: `/${d === "hydrants" ? "hidrantes" : d === "construction" ? "levantamientos" : "diagnosticos"}/${encodeURIComponent(id)}`,
    simulation:
      d === "diagnostics" && Boolean(r.isSimulation || r.hasSimulation),
    ...(d === "hydrants" && r.latestInspectionId
      ? {
          latestInspectionHref: `/revisiones/${encodeURIComponent(String(r.latestInspectionId))}`,
        }
      : {}),
  };
}
export async function loadMapLayer(
  domain: Domain,
  filters: Filters,
  bbox?: Bounds,
  signal?: AbortSignal,
): Promise<MapPage> {
  const response = await api.get(mapEndpoints[domain], {
    params: apiParams(domain, filters, bbox),
    signal,
  });
  const body = (
    domain === "diagnostics" ? response.data.data : response.data
  ) as { items: Row[]; limit: number; truncated: boolean };
  return {
    ...body,
    items: body.items
      .map((r) => adaptMapItem(domain, r))
      .filter((r): r is MapItem => r !== null),
  };
}
