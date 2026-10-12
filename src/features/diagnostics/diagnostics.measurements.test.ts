import { describe, expect, it } from "vitest";
import {
  elapsedTime,
  errorFlow,
  errorPercent,
} from "./diagnostics.measurements";

describe("Diagnostic measurement presentation", () => {
  it("formats signed ranges and observed flow in L/s", () => {
    expect(
      errorFlow({
        minimumErrorPct: -1.8,
        maximumErrorPct: 0.7,
        averageFlowLps: 1.23456,
      }),
    ).toBe("-1.80% a +0.70% / 1.23 L/s");
    expect(
      errorFlow({ minimumErrorPct: 1, maximumErrorPct: 1, averageFlowLps: 0 }),
    ).toBe("+1.00% a +1.00% / 0.00 L/s");
  });
  it("renders each missing datum independently", () => {
    expect(
      errorFlow({
        minimumErrorPct: null,
        maximumErrorPct: null,
        averageFlowLps: 1.2,
      }),
    ).toBe("— / 1.20 L/s");
    expect(
      errorFlow({
        minimumErrorPct: -1.2,
        maximumErrorPct: 0.8,
        averageFlowLps: null,
      }),
    ).toBe("-1.20% a +0.80% / —");
    expect(errorFlow()).toBe("— / —");
    expect(errorFlow(null)).toBe("— / —");
  });
  it("rounds only for display with consistent precision and no negative zero", () => {
    expect(errorPercent(-0.42456789)).toBe("-0.42%");
    expect(errorPercent("1.23456789")).toBe("+1.23%");
    expect(errorPercent(-0.001)).toBe("0.00%");
    expect(errorPercent(0)).toBe("0.00%");
  });
  it.each([null, undefined, "", " ", NaN, Infinity, false, {}])(
    "handles missing/invalid %s",
    (value) => {
      expect(errorPercent(value)).toBe("—");
      expect(elapsedTime(value)).toBe("—");
    },
  );
  it.each([
    [47, "00:47"],
    [248, "04:08"],
    [755, "12:35"],
    [3912, "65:12"],
    [0, "00:00"],
    [59.9, "00:59"],
  ])(
    "formats %s seconds as %s without wrapping minutes",
    (seconds, formatted) => {
      expect(elapsedTime(seconds)).toBe(formatted);
    },
  );
  it("rejects negative durations", () => expect(elapsedTime(-1)).toBe("—"));
});
