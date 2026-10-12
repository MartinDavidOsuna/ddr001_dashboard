import type {
  CabinetAdminDossier,
  CabinetAdminPhoto,
} from "./cabinets.generated";
import { label } from "./cabinets.format";
export function subjectAnchor(subject: string, dossier?: CabinetAdminDossier) {
  if (subject === "registration") return "#registration";
  if (subject === "final_review" || subject === "cabinet")
    return "#final-review";
  if (dossier?.pieces.instances.some((p) => p.code === subject))
    return `#piece-${encodeURIComponent(subject)}`;
  if (dossier?.installation.checklist.some((q) => q.code === subject))
    return `#question-${encodeURIComponent(subject)}`;
  return "#installation";
}
export function photoRelations(
  photo: CabinetAdminPhoto,
  dossier: CabinetAdminDossier,
) {
  const map = new Map<
    string,
    { subject: string; name: string; href: string; confirmed: boolean }
  >();
  for (const r of photo.relations) {
    const piece = dossier.pieces.instances.find((p) => p.code === r.subject);
    const question = dossier.installation.checklist.find(
      (q) => q.code === r.subject,
    );
    map.set(r.subject, {
      subject: r.subject,
      name: piece
        ? `Pieza ${piece.description} (${piece.code})`
        : question
          ? `Pregunta ${question.code}`
          : label(r.subject),
      href: subjectAnchor(r.subject, dossier),
      confirmed: r.confirmed,
    });
  }
  return [...map.values()];
}
export function photoGroups(photos: CabinetAdminPhoto[]) {
  const groups = new Map<string, CabinetAdminPhoto[]>();
  for (const photo of new Map(photos.map((p) => [p.photoId, p])).values())
    groups.set(photo.context, [...(groups.get(photo.context) || []), photo]);
  return [...groups].map(([context, items]) => ({ context, items }));
}
export function checklistGroups(dossier: CabinetAdminDossier) {
  const groups = new Map<
    string,
    CabinetAdminDossier["installation"]["checklist"]
  >();
  for (const question of dossier.installation.checklist)
    groups.set(question.group, [
      ...(groups.get(question.group) || []),
      question,
    ]);
  return [...groups].map(([name, questions]) => ({ name, questions }));
}
