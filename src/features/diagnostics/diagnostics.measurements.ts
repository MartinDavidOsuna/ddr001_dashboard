import type { FlowMeasurementSummary } from "./diagnostics.types";

function numeric(value: unknown): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  )
    return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function errorPercent(value: unknown): string {
  const result = numeric(value);
  if (result === null) return "—";
  const formatted = (Math.abs(result) < 0.005 ? 0 : result).toFixed(2);
  return `${Number(formatted) > 0 ? "+" : ""}${formatted}%`;
}
export function errorFlow(summary?: FlowMeasurementSummary | null): string {
  const min = numeric(summary?.minimumErrorPct);
  const max = numeric(summary?.maximumErrorPct);
  const flow = numeric(summary?.averageFlowLps);
  const range =
    min === null || max === null
      ? "—"
      : `${errorPercent(min)} a ${errorPercent(max)}`;
  return `${range} / ${flow === null || flow < 0 ? "—" : `${flow.toFixed(2)} L/s`}`;
}
/** API durationSeconds is DATEDIFF(SECOND, client_created_at, client_closed_at). */
export function elapsedTime(value: unknown): string {
  const seconds = numeric(value);
  if (seconds === null || seconds < 0) return "—";
  const wholeSeconds = Math.floor(seconds);
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, "0")}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}
