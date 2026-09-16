import axios from "axios";
import { problemMessage } from "@/api/client";
export const labels: Record<string, string> = {
  VISUAL: "Lectura visual",
  MANUAL: "Manual",
  LED: "Sensor LED",
  BLE: "Bluetooth",
  SIMULATION: "SIMULACIÓN",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  NO_CONCLUYENTE: "No concluyente",
  APRUEBA: "Aprueba",
  RECHAZA: "Rechaza",
  OPEN: "En proceso",
  CLOSED: "Finalizado",
  CLOSED_VALID: "Muestra cerrada válida",
  INVALID_EVIDENCE: "Evidencia inválida",
  OK: "Correcta",
  VERIFIED: "Verificada",
  COMPROMISED: "Comprometida",
  MISMATCH: "Hash no coincide",
  CORRUPT: "Corrupta",
  PENDING: "Pendiente de revisión",
  REVIEWED: "Revisado",
  FLAGGED: "Marcado",
  RESOLVED: "Resuelto",
  PASS: "Cumple",
  FAIL: "No cumple",
  INCONCLUSIVE: "No concluyente",
  NOT_APPLICABLE: "No aplica",
  START: "Inicio",
  INTERMEDIATE: "Intermedio",
  FINAL: "Final",
  MANUAL_DIAGNOSTIC: "Diagnóstico manual",
  EXTRA: "Adicional",
  STORED: "Almacenada sin vincular",
  LINKED: "Vinculada",
  QUARANTINED: "En cuarentena",
};
export const label = (v: unknown) =>
  typeof v === "string" ? (labels[v] ?? v) : "No disponible";
export const hasValue = (v: unknown) =>
  v !== null && v !== undefined && v !== "";
export function number(v: unknown, unit = "", exact = false): string {
  if (
    !hasValue(v) ||
    !["number", "string"].includes(typeof v) ||
    !Number.isFinite(Number(v))
  )
    return "No disponible";
  return `${exact ? String(v) : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 6 }).format(Number(v))}${unit ? ` ${unit}` : ""}`;
}
export function date(v: unknown): string {
  if (typeof v !== "string" || !v || Number.isNaN(Date.parse(v)))
    return "No disponible";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "America/Hermosillo",
  }).format(new Date(v));
}
export function duration(v: unknown): string {
  return number(v, "s");
}
export function display(v: unknown): string {
  if (!hasValue(v)) return "No disponible";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number")
    return Number.isFinite(v) ? String(v) : "No disponible";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}
export function diagnosticError(e: unknown): string {
  if (
    axios.isAxiosError(e) &&
    e.response?.status === 404 &&
    !e.response?.data?.code
  )
    return "La API activa no expone Diagnósticos. Se requiere desplegar el contrato administrativo funcional.";
  return problemMessage(
    e,
    "No fue posible consultar Diagnósticos. Intenta nuevamente.",
  );
}
export function errorCode(e: unknown): string | undefined {
  return axios.isAxiosError(e)
    ? (e.response?.data?.code ?? e.response?.data?.error?.code)
    : undefined;
}
export function utcDateRange(from: string, to: string) {
  return {
    ...(from ? { from: new Date(`${from}T00:00:00-07:00`).toISOString() } : {}),
    ...(to
      ? {
          to: new Date(
            new Date(`${to}T00:00:00-07:00`).getTime() + 86400000,
          ).toISOString(),
        }
      : {}),
  };
}
export const canReview = (role?: string) =>
  role === "admin" || role === "supervisor";
export const canManageAccess = (role?: string) => role === "admin";
export function reviewUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
