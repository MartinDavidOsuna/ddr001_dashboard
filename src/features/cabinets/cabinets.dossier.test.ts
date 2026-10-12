import { describe, expect, it } from "vitest";
import { assertContract } from "./cabinets.contract";
import type { CabinetAdminDossier } from "./cabinets.generated";
import {
  checklistGroups,
  photoGroups,
  photoRelations,
  subjectAnchor,
} from "./cabinets.dossier";
import fixture from "../../../tests/fixtures/cabinets.json";
const dossier = assertContract<CabinetAdminDossier>(
  "CabinetAdminDossier",
  fixture.dossier,
);
describe("Dossier adapters preserve frozen information", () => {
  it("groups frozen questions in contract order, without current-policy reconstruction", () => {
    const groups = checklistGroups(dossier);
    expect(groups.map((g) => g.name)).toEqual(["anchoring", "function"]);
    expect(groups.flatMap((g) => g.questions)).toEqual(
      dossier.installation.checklist,
    );
  });
  it("keeps shared photography as one file with several piece references", () => {
    expect(
      photoGroups([...dossier.photos, ...dossier.photos])[0]!.items,
    ).toHaveLength(1);
    expect(photoRelations(dossier.photos[0]!, dossier)).toHaveLength(2);
    expect(photoRelations(dossier.photos[0]!, dossier)[0]!.name).toContain(
      "Medidor electromagnético",
    );
  });
  it("links pendings directly to the appropriate section", () => {
    expect(subjectAnchor("CI003", dossier)).toBe("#question-CI003");
    expect(subjectAnchor("A3.r1.u1", dossier)).toBe("#piece-A3.r1.u1");
    expect(subjectAnchor("registration", dossier)).toBe("#registration");
    expect(subjectAnchor("final_review", dossier)).toBe("#final-review");
  });
});
