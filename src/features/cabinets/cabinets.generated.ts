// Generated from ddr001_api cf6105b15f0b84d522ef04a7d5bcf4ac23516f96.
export type CabinetAdminRow = {
  missingUnits: number;
  cabinetId: string;
  uid: string;
  formattedUid: string;
  model: "A1" | "A2" | "A3" | "A4";
  automated: boolean;
  displayModel: string;
  status:
    | "draft"
    | "registered"
    | "incomplete"
    | "validated"
    | "installed"
    | "deliverable";
  version: number;
  base: {
    surveyId: string;
    displayIdentifier: string;
    status: string;
    accountNumber: string | null;
    location: CabinetAdminBaseLocation | null;
  } | null;
  installationAccountNumber: string | null;
  accountDiscrepancy: boolean;
  crew: {
    id: string;
    name: string;
    source:
      "linked_base" | "registration_profile" | "session_history_consensus";
  } | null;
  registeredBy: { id: string; name: string | null };
  createdAt: string | null;
  registeredAt: string | null;
  validatedAt: string | null;
  installedAt: string | null;
  deliverableAt: string | null;
  reviewedAt: string | null;
  location: CabinetGps | null;
  installationValid: boolean;
  approvalValid: boolean;
  approvalInvalidated: boolean;
  reviewCorrection: boolean;
  finalReviewState:
    | "approved"
    | "correction_required"
    | "approval_invalidated"
    | "affected_data_pending"
    | "mandatory_tests_pending"
    | "pending_review"
    | "not_installed";
  distanceToBaseMeters: number | null;
  mandatoryTests: number;
  blockingCount: number;
  photos: {
    total: number;
    relationConfirmed: number;
    storageConfirmedAtLastCheck: number;
    problemsAtLastCheck: number;
    unknown: number;
    missingAtLastCheck: number;
    oldestCheckAt: string | null;
  };
};
export type CabinetAdminBaseLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};
export type CabinetGps = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
};
export type CabinetAdminHistory = {
  operationId: string;
  type: string;
  actor: { id: string; name: string | null; type: "field_user" };
  capturedAt: string | null;
  receivedAt: string | null;
  previousVersion: number;
  resultVersion: number;
  status:
    | "draft"
    | "registered"
    | "incomplete"
    | "validated"
    | "installed"
    | "deliverable";
  approvalInvalidated: boolean;
  command: CabinetCommand;
  cabinet: CabinetSnapshot;
};
export type CabinetCommand =
  | CabinetRegister
  | CabinetRegistrationClose
  | CabinetPartsSave
  | CabinetPartsValidate
  | CabinetInstallationSave
  | CabinetInstallationClose
  | CabinetIdentityCorrect
  | CabinetFinalReview;
export type CabinetRegister = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "register";
  uid: string;
  model: "A1" | "A2" | "A3" | "A4";
  automated: boolean;
  catalogVersion:
    | "ddr001-cabinets-20261005-v1"
    | "ddr001-cabinets-20261015-v2"
    | "ddr001-cabinets-20261023-v3";
  expectedCrewId?: string | null;
};
export type CabinetRegistrationClose = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "registration_close";
  evidence: Array<CabinetEvidence>;
};
export type CabinetEvidence = {
  photoId: string;
  confirmed: true;
  legible?: boolean;
};
export type CabinetPartsSave = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "parts_save";
  parts: Array<CabinetPartCapture>;
  reason?: string;
  partsReviewPolicyVersion?:
    "ddr001-parts-20261019-v1" | "ddr001-parts-20261019-v2";
};
export type CabinetPartCapture = {
  code: string;
  present: boolean | null;
  serial?: string | null;
  serialException?: ("illegible" | "unavailable") | null;
  reason?: string;
  observations?: string;
  evidence: Array<CabinetEvidence>;
};
export type CabinetPartsValidate = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "parts_validate";
};
export type CabinetInstallationSave = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "installation_save";
  installation: CabinetInstallation;
  reason?: string;
};
export type CabinetInstallation = {
  baseId: string;
  accountNumber?: string | null;
  accountResolution?: {
    decision: "use_base" | "use_cabinet" | "no_account";
    reason: string;
  };
  gps: CabinetGps;
  answers: Array<CabinetAnswer>;
  evidence: Record<string, Array<CabinetEvidence>>;
  observations?: string;
};
export type CabinetAnswer = {
  code: string;
  answer: "yes" | "no" | "not_checked" | "not_applicable";
  reason?: string;
  pendingReason?:
    "no_water" | "no_pressure" | "no_power" | "no_solar_conditions";
  assessment?: "minor" | "blocking";
  impact?: { safety: boolean; protection: boolean; function: boolean };
  evidence?: Array<CabinetEvidence>;
  serialComponents?: Array<string>;
};
export type CabinetInstallationClose = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "installation_close";
};
export type CabinetIdentityCorrect = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "identity_correct";
  model: "A1" | "A2" | "A3" | "A4";
  automated: boolean;
  reason: string;
};
export type CabinetFinalReview = {
  operationId: string;
  expectedVersion: number;
  capturedAt: string;
  type: "final_review";
  fieldChecked: true;
  dossierConsulted: true;
  installationOperationId: string;
  verdict: "approve" | "correction_required";
  reason: string;
  evidence: Array<CabinetEvidence>;
  evidenceConfirmed: true;
  resolvesReview?: { operationId: string; reason: string };
};
export type CabinetSnapshot = {
  administration?: CabinetAdminAdministration;
  cabinetId: string;
  uid: string;
  model: "A1" | "A2" | "A3" | "A4";
  automated: boolean;
  catalogVersion: string;
  closurePolicyVersion: string;
  partDefinitions: Array<CabinetPhysicalPart>;
  version: number;
  status:
    | "draft"
    | "registered"
    | "incomplete"
    | "validated"
    | "installed"
    | "deliverable";
  registrationEvidence: Array<CabinetEvidence>;
  parts: Array<CabinetPartCapture>;
  partsValidated: boolean;
  installation: CabinetInstallation | null;
  installationOperationId: string | null;
  installationValid: boolean;
  approval: { operationId: string; version: number } | null;
  reviewCorrection: { operationId: string; reason: string } | null;
  pending: Array<CabinetPending>;
  knownFailures: Array<string>;
  registrationCompany?: {
    id: string;
    name: string;
    source: "registration_profile" | "session_history_consensus";
  };
  partsReviewPolicyVersion?:
    "ddr001-parts-20261019-v1" | "ddr001-parts-20261019-v2";
  partsReviewPolicy?:
    | {
        version: "ddr001-parts-20261019-v1";
        evidenceRequired: boolean;
        parts: Record<
          string,
          {
            side: "district" | "producer";
            order: number;
            serial: "required" | "none";
          }
        >;
      }
    | {
        version: "ddr001-parts-20261019-v2";
        evidenceRequired: boolean;
        parts: Record<
          string,
          {
            side: "district" | "producer";
            order: number;
            serial: "required" | "none";
            step: "district" | "producer" | "automation";
          }
        >;
        universalParts: Array<CabinetPhysicalPart>;
      };
};
export type CabinetAdminAdministration = {
  installationDate?: string | null;
  administrativeNotes?: string;
  archivedAt?: string;
  cancellation?: {
    operationId: string;
    installationOperationId: string | null;
    baseId: string | null;
    reason: string;
    actorId: string;
    cancelledAt: string;
  };
};
export type CabinetPhysicalPart = {
  displayName?: string;
  canonicalPartKey?: string;
  code: string;
  key: string | null;
  description: string;
  position: string;
  serial: "required" | "optional" | "none";
  automatedOnly: boolean;
  source: {
    file: string;
    sheet: string | null;
    row: number | null;
    quantity: number;
    version: string;
    key: string | null;
    description: string;
  };
};
export type CabinetPending = {
  code: string;
  subject: string;
  classification: "blocking" | "minor" | "mandatory_test";
  reason: string;
};
export type CabinetAdminIntegrity = {
  photoId: string;
  status:
    | "confirmed"
    | "missing_original"
    | "missing_thumbnail"
    | "hash_mismatch"
    | "missing_mapping"
    | "mapping_conflict"
    | "deleted"
    | "not_verified"
    | "not_found";
  checkedAt: string | null;
  originalPresent: boolean;
  thumbnailPresent: boolean;
  storageVerified: boolean;
  retryable: boolean;
};
export type CabinetAdminPhoto = {
  photoId: string;
  context: string;
  capturedAt: string | null;
  receivedAt: string | null;
  actor: { id: string; name: string | null };
  metadata: {
    capturedAt: string | null;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    altitude?: number | null;
  };
  integrity: CabinetAdminIntegrity;
  relations: Array<{
    operationId: string;
    photoId: string;
    subject: string;
    confirmed: boolean;
    legible: boolean;
  }>;
  thumbnailUrl: string;
  contentUrl: string;
};
export type CabinetAdminSummary = {
  productionTarget: number;
  produced: number;
  productionPercent: number;
  remainingToProduce: number;
  total: number;
  draft: number;
  registered: number;
  incomplete: number;
  validated: number;
  installed: number;
  deliverable: number;
  standard: number;
  automated: number;
  registeredMilestone: number;
  installedMilestone: number;
  pendingFinalReview: number;
  correctionRequired: number;
  testsPending: number;
  invalidatedApprovals: number;
  installedWithoutAccount: number;
  photoCount: number;
  relationConfirmedEvidenceCount: number;
  storageConfirmedAtLastCheck: number;
  problemsAtLastCheck: number;
  integrityUnknownCount: number;
  missingAtLastCheck: number;
  oldestCheckAt: string | null;
  target: number;
  targets: { A1: number; A2: number; A3: number; A4: number };
  registeredPercent: number;
  installedPercent: number;
  deliverablePercent: number;
  integrityBasis: string;
  timeBasis: string;
};
export type CabinetAdminList = {
  items: Array<CabinetAdminRow>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type CabinetAdminMap = {
  items: Array<CabinetAdminRow>;
  limit: number;
  truncated: boolean;
  layer: "construction_cabinets";
};
export type CabinetAdminMetrics = {
  missingParts: Array<{
    partCode: string;
    canonicalPartKey: string;
    displayName: string;
    model: string;
    automated: boolean;
    missingUnits: number;
    affectedCabinets: number;
    confirmedAbsentUnits: number;
    notReviewedUnits: number;
  }>;
  models: Array<{
    total: number;
    draft: number;
    registered: number;
    incomplete: number;
    validated: number;
    installed: number;
    deliverable: number;
    standard: number;
    automated: number;
    registeredMilestone: number;
    installedMilestone: number;
    productionTarget: number;
    produced: number;
    productionPercent: number;
    remainingToProduce: number;
    model: string;
    target: number;
  }>;
  states: Array<{ status: string; total: number }>;
  variants: Array<{ automated: boolean; status: string; total: number }>;
  companies: Array<{
    total: number;
    draft: number;
    registered: number;
    incomplete: number;
    validated: number;
    installed: number;
    deliverable: number;
    standard: number;
    automated: number;
    registeredMilestone: number;
    installedMilestone: number;
    crewId: string | null;
    crewName: string | null;
  }>;
  incomplete: Array<{ model: string; automated: boolean; total: number }>;
  activity: Array<{
    date: string;
    registered: number;
    validated: number;
    installations: number;
    finalApprovals: number;
    invalidations: number;
  }>;
  cycle: {
    registrationToValidationSeconds: number | null;
    validationToInstallationSeconds: number | null;
    installationToApprovalSeconds: number | null;
    validationPairs: number;
    installationPairs: number;
    approvalPairs: number;
  };
  timeBasis: string;
  activityCounts: string;
  companyBasis: string;
  cycleBasis: string;
};
export type CabinetAdminDossier = {
  missingParts: Array<{
    partCode: string;
    canonicalPartKey: string;
    displayName: string;
    missing: boolean;
    reviewState: "present" | "absent" | "not_reviewed";
    serialPending: boolean;
    observations: string | null;
  }>;
  identification: {
    cabinetId: string;
    uid: string;
    formattedUid: string;
    model: string;
    automated: boolean;
    displayModel: string;
    status:
      | "draft"
      | "registered"
      | "incomplete"
      | "validated"
      | "installed"
      | "deliverable";
    version: number;
    catalogVersion: string;
    policyVersion: string;
    crew: {
      id: string;
      name: string;
      source:
        "linked_base" | "registration_profile" | "session_history_consensus";
    } | null;
    registeredBy: { id: string; name: string | null };
    registeredAt: string | null;
    validatedAt: string | null;
    installedAt: string | null;
    deliverableAt: string | null;
  };
  base: {
    surveyId: string;
    displayIdentifier: string;
    status: string;
    accountNumber: string | null;
    location: CabinetAdminBaseLocation | null;
    installationAccountNumber: string | null;
    accountDiscrepancy: boolean;
    distanceToInstallationMeters: number | null;
    dossierUrl: string;
  } | null;
  pieces: {
    catalogVersion: string;
    validated: boolean;
    groups: Array<{ position: string; partCodes: Array<string> }>;
    instances: Array<
      CabinetPhysicalPart & {
        capture: CabinetPartCapture | null;
        serialState: string;
        lastCapture: {
          operationId: string;
          actorId: string;
          capturedAt: string | null;
          receivedAt: string | null;
        } | null;
        pending: Array<CabinetPending>;
        evidenceRequired: boolean;
      }
    >;
    attempts: Array<CabinetAdminHistory>;
  };
  installation: {
    data: CabinetInstallation | null;
    valid: boolean;
    closureOperationId: string | null;
    policyVersion: string;
    checklist: Array<{
      code: string;
      group: string;
      label: string;
      kind: string;
      automatedOnly: boolean;
      applicability:
        "not_applicable_catalog" | "recorded_exception" | "applicable";
      answer: CabinetAnswer | null;
      evidence: Array<CabinetEvidence>;
      pending: Array<CabinetPending>;
      capturedBy: {
        actorId: string;
        operationId: string;
        capturedAt: string | null;
        receivedAt: string | null;
      } | null;
    }>;
    captures: Array<CabinetAdminHistory>;
  };
  finalReview: {
    state:
      | "approved"
      | "correction_required"
      | "approval_invalidated"
      | "affected_data_pending"
      | "mandatory_tests_pending"
      | "pending_review"
      | "not_installed";
    approval: { operationId: string; version: number } | null;
    correction: { operationId: string; reason: string } | null;
    pending: Array<CabinetPending>;
    attempts: Array<CabinetAdminHistory>;
    invalidations: Array<CabinetAdminHistory>;
  };
  catalog: object;
  photos: Array<CabinetAdminPhoto>;
  history: Array<CabinetAdminHistory>;
  evidencePolicy: string;
  synchronization: { serverVersion: number; receivedOperations: number };
  administration?: CabinetAdminAdministration;
  administrativeHistory?: Array<{
    audit_id: number;
    actor_id: string;
    actorName: string | null;
    action: string;
    before_json: string | null;
    after_json: string | null;
    occurred_at: string | null;
  }>;
};
export type CabinetAdminEditRequest = {
  operationId: string;
  expectedVersion: number;
  reason: string;
  changes: {
    model?: "A1" | "A2" | "A3" | "A4";
    automated?: boolean;
    companyId?: string;
    installationDate?: string | null;
    administrativeNotes?: string;
    installationObservations?: string;
  };
};
export type CabinetAdminCancelRequest = {
  operationId: string;
  expectedVersion: number;
  reason: string;
  confirm: true;
};
export type CabinetAdminDeleteRequest = {
  operationId: string;
  expectedVersion: number;
  reason: string;
  confirmUid: string;
  confirm: true;
};
export type CabinetAdminMutationResult = {
  cabinet: CabinetSnapshot;
  approvalInvalidated: boolean;
  replayed: boolean;
};
export type CabinetAdminOptions = {
  models: Array<"A1" | "A2" | "A3" | "A4">;
  companies: Array<{ id: string; name: string }>;
};
