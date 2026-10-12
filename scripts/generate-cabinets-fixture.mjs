// Test-only fixture builder using the checked-in OpenAPI snapshot; never imported by production.
import { readFileSync, writeFileSync } from "node:fs";
const schemas = JSON.parse(
  readFileSync("src/features/cabinets/cabinets.schemas.json", "utf8"),
);
function fill(s) {
  if (s.nullable) return null;
  if (s.$ref) return fill(schemas[s.$ref.split("/").at(-1)]);
  if (s.enum) return s.enum[0];
  if (s.allOf) return Object.assign({}, ...s.allOf.map(fill));
  if (s.oneOf || s.anyOf) return fill((s.oneOf || s.anyOf)[0]);
  if (s.type === "array") return [];
  if (s.type === "object")
    return Object.fromEntries(
      (s.required || []).map((k) => [k, fill(s.properties[k])]),
    );
  if (s.type === "boolean") return false;
  if (s.type === "number" || s.type === "integer") return 0;
  return s.format === "uuid"
    ? "00000000-0000-4000-8000-000000000001"
    : s.format === "date-time"
      ? "2026-10-05T12:00:00Z"
      : "TEST";
}
const make = (name) => fill(schemas[name]);
const id = "00000000-0000-4000-8000-000000000001",
  date = "2026-10-05T12:00:00Z";
const gps = { latitude: 22, longitude: -102, accuracy: 5 };
const row = {
  ...make("CabinetAdminRow"),
  cabinetId: id,
  uid: "AQ26000017",
  formattedUid: "AQ26-00001-7",
  model: "A3",
  automated: true,
  displayModel: "A3-A",
  status: "installed",
  version: 5,
  registeredAt: date,
  installedAt: date,
  validatedAt: date,
  location: gps,
  installationValid: true,
  crew: { id, name: "Empresa TEST", source: "linked_base" },
  registeredBy: { id, name: "Residente TEST" },
  base: {
    surveyId: id,
    displayIdentifier: "BASE-TEST-001",
    status: "accepted",
    accountNumber: "00123",
    location: gps,
  },
  installationAccountNumber: "00456",
  accountDiscrepancy: true,
  finalReviewState: "pending_review",
};
const summary = {
  ...make("CabinetAdminSummary"),
  total: 8,
  registeredMilestone: 7,
  installedMilestone: 2,
  installed: 1,
  deliverable: 1,
  incomplete: 2,
  standard: 4,
  automated: 4,
  target: 460,
  targets: { A1: 41, A2: 105, A3: 290, A4: 24 },
  registeredPercent: 1.5,
  installedPercent: 0.4,
  deliverablePercent: 0.2,
};
const metrics = make("CabinetAdminMetrics");
metrics.models = ["A1", "A2", "A3", "A4"].map((model) => ({
  total: 2,
  draft: 0,
  registered: 1,
  incomplete: 1,
  validated: 0,
  installed: 0,
  deliverable: 0,
  standard: 1,
  automated: 1,
  registeredMilestone: 2,
  installedMilestone: 0,
  model,
  target: summary.targets[model],
}));
metrics.states = [
  "draft",
  "registered",
  "incomplete",
  "validated",
  "installed",
  "deliverable",
].map((status) => ({ status, total: status === "incomplete" ? 2 : 1 }));
metrics.variants = metrics.states.flatMap((s) =>
  [false, true].map((automated) => ({ automated, status: s.status, total: 1 })),
);
metrics.companies = [
  { ...metrics.models[0], crewId: id, crewName: "Empresa TEST" },
  { ...metrics.models[1], crewId: null, crewName: null },
];
metrics.incomplete = [{ model: "A3", automated: true, total: 2 }];
metrics.activity = [
  {
    date: "2026-10-05",
    registered: 2,
    validated: 1,
    installations: 1,
    finalApprovals: 1,
    invalidations: 1,
  },
];
metrics.cycle = {
  registrationToValidationSeconds: 3600,
  validationToInstallationSeconds: null,
  installationToApprovalSeconds: 90000,
  validationPairs: 1,
  installationPairs: 0,
  approvalPairs: 1,
};
const dossier = make("CabinetAdminDossier");
dossier.identification = {
  ...row,
  catalogVersion: "ddr001-cabinets-20261005-v1",
  policyVersion: "ddr001-installation-v1",
};
dossier.base = {
  ...row.base,
  installationAccountNumber: row.installationAccountNumber,
  accountDiscrepancy: true,
  distanceToInstallationMeters: 42.5,
  dossierUrl: `/api/v1/admin/dashboard/construction/surveys/${id}`,
};
const photo = {
  ...make("CabinetAdminPhoto"),
  photoId: id,
  context: "parts",
  capturedAt: date,
  receivedAt: date,
  actor: { id, name: "Residente TEST" },
  metadata: { ...gps, capturedAt: date },
  integrity: {
    photoId: id,
    status: "confirmed",
    checkedAt: date,
    originalPresent: true,
    thumbnailPresent: true,
    storageVerified: true,
    retryable: false,
  },
  relations: [],
  thumbnailUrl: `/api/v1/admin/dashboard/construction/cabinets/${id}/photos/${id}/thumbnail`,
  contentUrl: `/api/v1/admin/dashboard/construction/cabinets/${id}/photos/${id}/content`,
};
const serials = [
  "captured",
  "pending",
  "illegible",
  "unavailable",
  "optional_not_captured",
  "not_applicable",
];
dossier.pieces.instances = serials.map((serialState, i) => ({
  ...make("CabinetPhysicalPart"),
  code: `A3.r${i + 1}.u1`,
  description: i === 0 ? "Medidor electromagnético" : `Pieza TEST ${i + 1}`,
  position: "principal.1",
  source: { ...make("CabinetPhysicalPart").source, quantity: 1 },
  serial: i === 4 ? "optional" : i === 5 ? "none" : "required",
  capture:
    i === 4
      ? null
      : {
          code: `A3.r${i + 1}.u1`,
          present: true,
          serial: i === 0 ? "000ABC007" : null,
          evidence: [{ photoId: id, confirmed: true }],
          observations: "Captura TEST",
        },
  serialState,
  lastCapture:
    i === 0
      ? { operationId: id, actorId: id, capturedAt: date, receivedAt: date }
      : null,
  pending: [],
  evidenceRequired: false,
}));
dossier.pieces.groups = [
  {
    position: "principal.1",
    partCodes: dossier.pieces.instances.map((p) => p.code),
  },
];
photo.relations = dossier.pieces.instances.slice(0, 2).map((p) => ({
  operationId: id,
  photoId: id,
  subject: p.code,
  confirmed: true,
  legible: false,
}));
dossier.photos = [photo];
dossier.installation.data = {
  baseId: id,
  accountNumber: "00456",
  accountResolution: {
    decision: "use_cabinet",
    reason: "Resolución TEST preservada",
  },
  gps,
  answers: [],
  evidence: {},
  observations: "Instalación guardada TEST",
};
dossier.installation.valid = true;
dossier.installation.closureOperationId = id;
dossier.installation.policyVersion = "ddr001-installation-v1";
dossier.installation.checklist = [
  "yes",
  "no",
  "not_checked",
  "not_applicable",
].map((answer, i) => ({
  code: `CI00${i + 1}`,
  group: i < 2 ? "anchoring" : "function",
  label: `Pregunta histórica TEST ${i + 1}`,
  kind: "check",
  automatedOnly: false,
  applicability: "applicable",
  answer: { code: `CI00${i + 1}`, answer, reason: "Razón TEST", evidence: [] },
  evidence: [],
  pending:
    i === 2
      ? [
          {
            code: "TEST_PENDING",
            subject: "CI003",
            classification: "mandatory_test",
            reason: "Sin presión",
          },
        ]
      : [],
  capturedBy: null,
}));
dossier.installation.data.answers = dossier.installation.checklist.map(
  (q) => q.answer,
);
dossier.finalReview.state = "approval_invalidated";
dossier.finalReview.pending = [
  {
    code: "TEST_PENDING",
    subject: "CI003",
    classification: "mandatory_test",
    reason: "Sin presión",
  },
];
const snapshot = {
  ...make("CabinetSnapshot"),
  ...row,
  reviewCorrection: null,
  catalogVersion: dossier.identification.catalogVersion,
  closurePolicyVersion: dossier.identification.policyVersion,
  installation: dossier.installation.data,
  parts: dossier.pieces.instances
    .filter((p) => p.capture)
    .map((p) => p.capture),
  partDefinitions: dossier.pieces.instances,
  pending: dossier.finalReview.pending,
};
const event = {
  operationId: id,
  type: "parts_validate",
  actor: { id, name: "Residente TEST", type: "field_user" },
  capturedAt: date,
  receivedAt: date,
  previousVersion: 1,
  resultVersion: 2,
  status: "incomplete",
  approvalInvalidated: false,
  command: {
    operationId: id,
    expectedVersion: 1,
    capturedAt: date,
    type: "parts_validate",
  },
  cabinet: snapshot,
};
dossier.pieces.attempts = [
  event,
  {
    ...event,
    operationId: "00000000-0000-4000-8000-000000000002",
    status: "validated",
    resultVersion: 3,
  },
];
dossier.finalReview.invalidations = [
  {
    ...event,
    operationId: "00000000-0000-4000-8000-000000000004",
    type: "identity_correct",
    approvalInvalidated: true,
    command: {
      operationId: "00000000-0000-4000-8000-000000000004",
      expectedVersion: 4,
      capturedAt: date,
      type: "identity_correct",
      model: "A3",
      automated: true,
      reason: "Cambio de datos afectados TEST",
    },
  },
];
dossier.finalReview.attempts = [
  {
    ...event,
    operationId: "00000000-0000-4000-8000-000000000003",
    type: "final_review",
    status: "deliverable",
    command: {
      operationId: "00000000-0000-4000-8000-000000000003",
      expectedVersion: 4,
      capturedAt: date,
      type: "final_review",
      fieldChecked: true,
      dossierConsulted: true,
      installationOperationId: id,
      verdict: "approve",
      reason: "Aprobación anterior TEST",
      evidence: [{ photoId: id, confirmed: true }],
      evidenceConfirmed: true,
    },
  },
];
dossier.history = [
  ...dossier.pieces.attempts,
  ...dossier.finalReview.attempts,
  ...dossier.finalReview.invalidations,
];
dossier.evidencePolicy = "piece_photos_optional_series_required";
for (const event of dossier.pieces.attempts)
  event.cabinet = {
    ...snapshot,
    status: event.status,
    version: event.resultVersion,
  };
dossier.finalReview.attempts[0].cabinet = {
  ...snapshot,
  status: "deliverable",
  version: 5,
  approval: {
    operationId: dossier.finalReview.attempts[0].operationId,
    version: 5,
  },
  pending: [],
};
dossier.finalReview.attempts[0].previousVersion = 4;
dossier.finalReview.attempts[0].resultVersion = 5;
dossier.finalReview.invalidations[0].previousVersion = 5;
dossier.finalReview.invalidations[0].resultVersion = 6;
dossier.finalReview.invalidations[0].cabinet = {
  ...snapshot,
  status: "incomplete",
  version: 6,
  approval: null,
};
dossier.catalog = {
  catalogVersion: dossier.identification.catalogVersion,
  model: row.model,
  automated: row.automated,
  policy: {
    closurePolicyVersion: dossier.installation.policyVersion,
    questions: dossier.installation.checklist.map(
      ({ code, group, label, kind, automatedOnly }) => ({
        code,
        group,
        label,
        kind,
        automatedOnly,
      }),
    ),
  },
};
const list = { items: [row], page: 1, pageSize: 25, total: 26, totalPages: 2 };
const map = {
  items: [row],
  limit: 2000,
  truncated: false,
  layer: "construction_cabinets",
};
writeFileSync(
  "tests/fixtures/cabinets.json",
  JSON.stringify(
    { row, summary, metrics, dossier, photo, list, map },
    null,
    2,
  ) + "\n",
);
