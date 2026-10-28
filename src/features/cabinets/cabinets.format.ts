import axios from "axios";
import { date } from "@/features/diagnostics/diagnostics.format";
export { date };
export const canReadCabinets = (role?: string) =>
  role === "admin" || role === "supervisor";
export const statuses = [
  "draft",
  "registered",
  "incomplete",
  "validated",
  "installed",
  "deliverable",
] as const;
export const models = ["A1", "A2", "A3", "A4"] as const;
export const labels: Record<string, string> = {
  identity: "Identidad y ubicación",
  anchoring: "Base y anclaje",
  cabinet: "Gabinete y acceso",
  hydraulics: "Hidráulica",
  wiring: "Cableado y batería",
  solar: "Paneles solares",
  automation: "Actuadores y sensores",
  function: "Pruebas de funcionamiento",
  environment: "Entorno y limpieza",
  evidence: "Fotografías",
  correction: "Corrección",
  draft: "Borrador",
  registered: "Registrado",
  incomplete: "Incompleto",
  validated: "Validado",
  installed: "Instalado",
  deliverable: "Hidrante entregable",
  captured: "Capturada",
  pending: "Pendiente",
  illegible: "Ilegible",
  unavailable: "No disponible",
  optional_not_captured: "Opcional sin capturar",
  not_applicable: "No aplica",
  yes: "Sí",
  no: "No",
  not_checked: "No comprobado",
  approved: "Aprobado",
  correction_required: "Corrección requerida",
  approval_invalidated: "Aprobación invalidada",
  affected_data_pending: "Datos afectados pendientes",
  mandatory_tests_pending: "Pruebas obligatorias pendientes",
  pending_review: "Pendiente de revisión",
  not_installed: "No instalado",
  blocking: "Bloqueante",
  minor: "Observación menor",
  mandatory_test: "Prueba obligatoria pendiente",
  confirmed: "Confirmada",
  missing_original: "Original faltante",
  missing_thumbnail: "Miniatura faltante",
  hash_mismatch: "Integridad no coincide",
  missing_mapping: "Sin relación",
  mapping_conflict: "Relación en conflicto",
  deleted: "Eliminada",
  not_verified: "Desconocida / sin verificar",
  not_found: "No encontrada",
  registration: "Registro",
  registration_close: "Cierre de registro",
  parts: "Piezas",
  register: "Registro inicial",
  parts_save: "Captura de piezas",
  parts_validate: "Validación de piezas",
  installation: "Instalación",
  installation_save: "Captura de instalación",
  installation_close: "Cierre de instalación",
  identity_correct: "Corrección de identidad",
  final_review: "Revisión final",
  no_water: "Sin agua",
  no_pressure: "Sin presión",
  no_power: "Sin energía",
  no_solar_conditions: "Sin condiciones solares",
  use_base: "Usar cuenta de base",
  use_cabinet: "Usar cuenta de gabinete",
  no_account: "Sin cuenta",
  not_applicable_catalog: "No aplica según catálogo",
  recorded_exception: "Excepción registrada",
  applicable: "Aplicable",
};
export const label = (value?: string | null) =>
  value == null ? "—" : labels[value] || value;
export const text = (value: string | number | null | undefined) =>
  value == null ? "—" : String(value);
export const presence = (value?: boolean | null) =>
  value == null ? "—" : value ? "Sí" : "No";
export const displayModel = (value: {
  displayModel?: string;
  model: string;
  automated: boolean;
}) => value.displayModel || `${value.model}${value.automated ? "-A" : ""}`;
export function cycle(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0)
    return "Sin datos suficientes";
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(1)} días`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} horas`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  return `${seconds.toFixed(0)} s`;
}
export function cabinetError(error: unknown) {
  if (error instanceof Error && error.message === "CABINETS_CONTRACT_DRIFT")
    return (
      "La respuesta de Nuevos Hidrantes no coincide con el contrato administrativo esperado." +
      ("field" in error && typeof error.field === "string"
        ? ` Campo incompatible: ${error.field}.`
        : " Se requiere actualizar la integración.")
    );
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return (
    (
      {
        400: "Los filtros no son válidos. Revisa los valores y el rango de fechas.",
        401: "La sesión administrativa expiró. Inicia sesión nuevamente.",
        403: "Nuevos Hidrantes está disponible sólo para administradores y supervisores.",
        404: "El nuevo hidrante o la fotografía no existe o no está disponible.",
        409: "La integridad del archivo impide mostrar esta fotografía.",
        422: "El identificador solicitado no es válido.",
        503: "El módulo administrativo de Nuevos Hidrantes todavía no está disponible o actualizado. Intenta nuevamente más tarde.",
        500: "Ocurrió un error inesperado al consultar Nuevos Hidrantes.",
      } as Record<number, string>
    )[status || 0] ||
    "No fue posible consultar Nuevos Hidrantes. Intenta nuevamente."
  );
}
