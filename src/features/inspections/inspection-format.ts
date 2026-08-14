import type { ChecklistItem } from "@/api/types";
export const mandatoryPhotoSlots = [
  ["front_closed", "Frente cerrado"],
  ["left_side", "Lado izquierdo"],
  ["right_side", "Lado derecho"],
  ["back", "Parte posterior"],
  ["top", "Parte superior"],
  ["front_open", "Frente abierto"],
  ["serial_plate", "Placa o número de serie"],
] as const;
const discardedChecklistItemCodes = new Set(["municipality", "locality"]);
export function isDashboardChecklistItem(item: ChecklistItem) {
  return !discardedChecklistItemCodes.has(item.itemCode);
}
export function parseJson(value?: string) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
export function answerDisplay(item: ChecklistItem) {
  if (item.isNotApplicable) return "No aplica";
  if (!item.answerId) return "No capturado";
  if (item.fieldType === "boolean") return item.valueBoolean ? "Sí" : "No";
  if (item.valueNumber !== null && item.valueNumber !== undefined)
    return `${item.valueNumber}${item.unit ? ` ${item.unit}` : ""}`;
  const raw = item.valueJson ? parseJson(item.valueJson) : item.valueText;
  if (Array.isArray(raw)) return raw.join(", ");
  if (raw && typeof raw === "object") return JSON.stringify(raw);
  return raw === null || raw === undefined || raw === ""
    ? "No capturado"
    : String(raw);
}
export function groupChecklist(items: ChecklistItem[]) {
  const groups = new Map<
    string,
    {
      id: string;
      code: string;
      title: string;
      order: number;
      items: ChecklistItem[];
    }
  >();
  for (const item of items.filter(isDashboardChecklistItem)) {
    const group = groups.get(item.sectionId) || {
      id: item.sectionId,
      code: item.sectionCode,
      title: item.sectionTitle,
      order: item.sectionOrder,
      items: [],
    };
    group.items.push(item);
    groups.set(item.sectionId, group);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}
export function checklistCounts(items: ChecklistItem[]) {
  const answerable = items.filter(
    (i) =>
      isDashboardChecklistItem(i) &&
      !["photo", "coordinates", "signal", "readonly"].includes(i.fieldType),
  );
  return {
    captured: answerable.filter((i) => i.answerId || i.isNotApplicable).length,
    total: answerable.length,
  };
}
