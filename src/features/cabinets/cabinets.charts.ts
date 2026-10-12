import type { EChartsCoreOption } from "echarts/core";
import type { CabinetAdminMetrics } from "./cabinets.generated";
import { label } from "./cabinets.format";
const colors = [
  "#64748b",
  "#2563eb",
  "#b45309",
  "#16a34a",
  "#0891b2",
  "#7c3aed",
];
export function modelChart(metrics: CabinetAdminMetrics): EChartsCoreOption {
  return {
    animation: false,
    color: ["#cbd5e1", "#2563eb", "#0891b2", "#7c3aed"],
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 45, right: 12, top: 30, bottom: 65 },
    xAxis: { type: "category", data: metrics.models.map((m) => m.model) },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      ["Meta", "target"],
      ["Registro alcanzado", "registeredMilestone"],
      ["Instalación válida", "installedMilestone"],
      ["Entregables", "deliverable"],
    ].map(([name, field]) => ({
      name,
      type: "bar",
      data: metrics.models.map(
        (m) =>
          m[
            field as
              | "target"
              | "registeredMilestone"
              | "installedMilestone"
              | "deliverable"
          ],
      ),
    })),
  };
}
export function stateChart(metrics: CabinetAdminMetrics): EChartsCoreOption {
  return {
    animation: false,
    color: colors,
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["38%", "65%"],
        center: ["50%", "40%"],
        data: metrics.states
          .filter((s) => s.status !== "draft")
          .map((s) => ({
            name: label(s.status),
            value: s.total,
          })),
      },
    ],
  };
}
export function variantChart(metrics: CabinetAdminMetrics): EChartsCoreOption {
  const states = metrics.states.map((s) => s.status);
  return {
    animation: false,
    color: ["#2563eb", "#0d9488"],
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 45, right: 15, top: 25, bottom: 105 },
    xAxis: {
      type: "category",
      data: states.map(label),
      axisLabel: { rotate: 25 },
    },
    yAxis: { type: "value", minInterval: 1 },
    series: [false, true].map((automated) => ({
      name: automated ? "Automatizado" : "Estándar",
      type: "bar",
      stack: "variants",
      data: states.map(
        (status) =>
          metrics.variants.find(
            (v) => v.status === status && v.automated === automated,
          )?.total ?? 0,
      ),
    })),
  };
}
export function activityChart(metrics: CabinetAdminMetrics): EChartsCoreOption {
  return {
    animation: false,
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 45, right: 15, top: 25, bottom: 70 },
    xAxis: { type: "category", data: metrics.activity.map((a) => a.date) },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      ["Registros", "registered"],
      ["Validaciones", "validated"],
      ["Instalaciones", "installations"],
      ["Aprobaciones finales", "finalApprovals"],
      ["Invalidaciones", "invalidations"],
    ].map(([name, field]) => ({
      name,
      type: "line",
      data: metrics.activity.map(
        (a) =>
          a[
            field as
              | "registered"
              | "validated"
              | "installations"
              | "finalApprovals"
              | "invalidations"
          ],
      ),
    })),
  };
}
