import { describe, expect, it } from "vitest";
import {
  modelChart,
  stateChart,
  variantChart,
  activityChart,
} from "./cabinets.charts";
import { assertContract } from "./cabinets.contract";
import type { CabinetAdminMetrics } from "./cabinets.generated";
import fixture from "../../../tests/fixtures/cabinets.json";
const metrics = assertContract<CabinetAdminMetrics>(
  "CabinetAdminMetrics",
  fixture.metrics,
);
describe("Administrative aggregate charts", () => {
  it("uses server targets and event milestones without deriving them from current states", () => {
    expect(modelChart(metrics).series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Meta",
          data: metrics.models.map((m) => m.target),
        }),
        expect.objectContaining({
          name: "Registro alcanzado",
          data: metrics.models.map((m) => m.registeredMilestone),
        }),
      ]),
    );
  });
  it("separates technical drafts from formally registered states", () => {
    expect(stateChart(metrics).series).toEqual([
      expect.objectContaining({
        data: metrics.states
          .filter((s) => s.status !== "draft")
          .map((s) => ({
            name: (
              {
                registered: "Registrado",
                incomplete: "Incompleto",
                validated: "Validado",
                installed: "Instalado",
                deliverable: "Hidrante entregable",
              } as const
            )[s.status as Exclude<typeof s.status, "draft">],
            value: s.total,
          })),
      }),
    ]);
  });
  it("uses variant counts without creating targets and real event dates for activity", () => {
    expect(variantChart(metrics).series).toHaveLength(2);
    expect(activityChart(metrics).xAxis).toMatchObject({
      data: metrics.activity.map((a) => a.date),
    });
    expect(activityChart(metrics).series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Invalidaciones",
          data: metrics.activity.map((a) => a.invalidations),
        }),
      ]),
    );
  });
});
