import { describe, expect, it } from "vitest";
import {
  answerDisplay,
  checklistCounts,
  groupChecklist,
  isDashboardChecklistItem,
  mandatoryPhotoSlots,
} from "./inspection-format";

const base: any = {
  sectionId: "s",
  sectionCode: "one",
  sectionTitle: "Uno",
  sectionOrder: 1,
  itemId: "i",
  itemCode: "q",
  label: "Pregunta",
  fieldType: "boolean",
  itemOrder: 1,
  isRequired: true,
  isNotApplicable: false,
};

describe("inspection formatting", () => {
  it("preserves false as No", () =>
    expect(
      answerDisplay({ ...base, answerId: "a", valueBoolean: false }),
    ).toBe("No"));

  it("prioritizes not applicable", () =>
    expect(answerDisplay({ ...base, isNotApplicable: true })).toBe("No aplica"));

  it("formats units and arrays", () => {
    expect(
      answerDisplay({
        ...base,
        fieldType: "decimal",
        answerId: "a",
        valueNumber: 2.5,
        unit: "bar",
      }),
    ).toBe("2.5 bar");
    expect(
      answerDisplay({
        ...base,
        fieldType: "multiselect",
        answerId: "a",
        valueJson: '["A","B"]',
      }),
    ).toBe("A, B");
  });

  it("groups and counts dynamically", () => {
    const items = [base, { ...base, itemId: "p", fieldType: "photo" }];
    expect(groupChecklist(items)).toHaveLength(1);
    expect(checklistCounts(items)).toEqual({ captured: 0, total: 1 });
  });

  it("defines the seven current mandatory photo slots", () => {
    expect(mandatoryPhotoSlots.map(([code]) => code)).toEqual([
      "front_closed",
      "left_side",
      "right_side",
      "back",
      "top",
      "front_open",
      "serial_plate",
    ]);
  });

  it("excludes discarded territorial checklist fields from the dashboard", () => {
    expect(isDashboardChecklistItem({ ...base, itemCode: "municipality" })).toBe(false);
    expect(isDashboardChecklistItem({ ...base, itemCode: "locality" })).toBe(false);
    expect(groupChecklist([
      base,
      { ...base, itemId: "legacy-1", itemCode: "municipality" },
      { ...base, itemId: "legacy-2", itemCode: "locality" },
    ])[0]?.items).toHaveLength(1);
  });
});
