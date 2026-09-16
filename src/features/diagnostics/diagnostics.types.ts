import type {
  CaseRecord,
  FlowRecord,
  SampleRecord,
  SettingsRecord,
  PointRecord,
  Numeric,
} from "./diagnostics.generated";
export type { Numeric } from "./diagnostics.generated";
export type Simulation = "exclude" | "include" | "only";
export type Source = "VISUAL" | "MANUAL" | "LED" | "BLE" | "SIMULATION";
export type ReviewStatus = "PENDING" | "REVIEWED" | "FLAGGED" | "RESOLVED";
export type CaseVerdict = "APROBADO" | "RECHAZADO" | "NO_CONCLUYENTE";
export type Sort =
  | "createdAtDesc"
  | "createdAtAsc"
  | "closedAtDesc"
  | "meterIdAsc"
  | "verdictAsc";
export interface Page<T> {
  items: T[];
  page: { limit: number; nextCursor: string | null; sort: string };
}
export interface PageQuery {
  limit?: number;
  cursor?: string;
}
export interface SummaryQuery {
  simulation?: Simulation;
  from?: string;
  to?: string;
  userId?: string;
  testBenchId?: string;
}
export interface CaseQuery extends SummaryQuery, PageQuery {
  query?: string;
  verdict?: CaseVerdict;
  status?: "OPEN" | "CLOSED";
  q?: "Q1" | "Q2" | "Q3" | "Q4";
  measurementSource?: Source;
  reviewStatus?: ReviewStatus;
  integrityStatus?: "OK" | "COMPROMISED" | "VERIFIED" | "MISMATCH" | "CORRUPT";
  deviceModel?: string;
  syncStatus?: "received" | "pending";
  sort?: Sort;
}
export interface MetricsQuery extends SummaryQuery {
  measurementSource?: Source;
  q?: CaseQuery["q"];
  groupBy?: "day" | "week" | "month";
}
export type TrendMetric =
  | "cases"
  | "approved"
  | "rejected"
  | "inconclusive"
  | "samples"
  | "meanErrorPct";
export interface Summary {
  filters: SummaryQuery;
  cases: {
    total: number;
    approved: number;
    rejected: number;
    inconclusive: number;
  };
  uniqueMeters: number;
  technicians: number;
  totalSamples: number;
  samplesBySource: Record<Source, number>;
  evidence: {
    total: number;
    verified: number;
    pending: number;
    compromised: number;
  };
  sync: {
    storedUnlinked: number;
    partialReceipts: number;
    lastReceivedAt: string | null;
  };
  generatedAt: string;
}
export interface CaseItem {
  caseId: string;
  meterId: string;
  userId: string;
  technicianName: string;
  technicianEmail: string | null;
  status: "OPEN" | "CLOSED";
  overallVerdict: CaseVerdict | null;
  testBenchId: string;
  deviceModel: string | null;
  createdAt: string;
  closedAt: string | null;
  syncReceivedAt: string | null;
  durationSeconds: number | null;
  flowPointCount: number;
  sampleCount: number;
  evidenceCount: number;
  integrityStatus: string;
  measurementSources: Source[];
  reviewStatus: ReviewStatus;
  reviewClassification: string | null;
}
export interface Evidence extends Record<string, unknown> {
  evidenceId: string;
  sampleId: string;
  pointId: string | null;
  type: string;
  required: boolean;
  volumeRefL: Numeric | null;
  pulseCount: Numeric | null;
  capturedAt: string;
  clientSha256: string;
  serverSha256: string | null;
  mimeType: string;
  sizeBytes: Numeric;
  uploadStatus: string;
  integrityStatus: string;
  uploadedAt: string | null;
  linkedAt: string | null;
  verifiedAt: string | null;
  thumbnailAvailable: boolean;
  contentAvailable: boolean;
}
export interface Sample extends SampleRecord {
  operationalSettings: SettingsRecord | null;
  points: PointRecord[];
  evidence: Evidence[];
}
export interface FlowPoint extends FlowRecord {
  samples: Sample[];
}
export interface Review extends Record<string, unknown> {
  reviewId: string;
  caseId: string;
  status: ReviewStatus;
  classification: string | null;
  flags: string[];
  comment: string | null;
  reviewedBy: string;
  reviewedByName: string;
  reviewedAt: string;
  createdAt: string;
}
export interface EmbeddedReview extends Record<string, unknown> {
  reviewId: string;
  caseId: string;
  reviewStatus: ReviewStatus;
  classification: string | null;
  flags: string[];
  reviewComment: string | null;
  reviewedByAdminId: string;
  reviewedByNameSnapshot: string;
  reviewedAt: string;
  createdAt: string;
}
export interface Report extends Record<string, unknown> {
  reportId: string;
  caseId: string;
  version: number;
  checksum: string;
  createdAt: string;
  receivedAt: string;
  metadata?: unknown;
  htmlAvailable: boolean;
  pdfAvailable: boolean;
}
export interface EmbeddedReport extends Record<string, unknown> {
  reportId: string;
  caseId: string;
  version: number;
  checksum: string;
  metadata?: unknown;
  htmlAvailable: boolean;
  pdfAvailable: boolean;
  clientCreatedAt: string;
  serverCreatedAt: string;
}
export interface History extends Record<string, unknown> {
  historyId: string;
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
  metadata: unknown;
}
export interface RawDetail {
  meter: {
    meterId: string;
    externalStatus: string;
    externalSnapshot: unknown;
    externalCheckedAt: string | null;
  };
  technician: { userId: string; displayName: string; email: string | null };
  case: CaseRecord;
  flowPoints: FlowPoint[];
  reports: EmbeddedReport[];
  statusHistory: History[];
  reviews: EmbeddedReview[];
  currentReview: EmbeddedReview | null;
}
export interface Detail extends Omit<
  RawDetail,
  "reviews" | "currentReview" | "reports"
> {
  reviews: Review[];
  currentReview: Review | null;
  reports: Report[];
}
export interface Metrics {
  filters: MetricsQuery;
  buckets: Array<{
    period: string | null;
    caseCount: number;
    sampleCount: number;
    meanErrorPct: number | null;
    meanAbsoluteErrorPct: number | null;
    dispersionPct: number | null;
    repeatabilityPassCount: number;
    averageDurationSeconds: number | null;
  }>;
  verdicts: Array<{ verdict: string | null; count: number }>;
  byFlowPoint: Array<{
    code: string;
    sampleCount: number;
    meanErrorPct: number | null;
    dispersionPct: number | null;
  }>;
  bySource: Array<{ measurementSource: Source; count: number }>;
  byTechnician: Array<{
    userId: string;
    technician: string;
    caseCount: number;
  }>;
  evidenceIntegrity: Array<{ integrityStatus: string; count: number }>;
  evidenceCompleteness: {
    completeCaseCount: number | null;
    incompleteCaseCount: number | null;
  };
  byTestBench: Array<{
    testBenchId: string;
    caseCount: number;
    sampleCount: number;
  }>;
  samplesPerCase: Array<{ sampleCount: number; caseCount: number }>;
}
export interface Trends {
  metric: TrendMetric;
  timezone: "UTC";
  groupBy: string;
  points: Array<{ period: string | null; value: number | null; count: number }>;
}
export interface User extends Record<string, unknown> {
  userId: string;
  displayName: string;
  email: string | null;
  isActive: boolean;
  accessEnabled: boolean;
  accessCreatedAt: string | null;
  accessUpdatedAt: string | null;
  caseCount: number;
  lastFunctionalActivityAt: string | null;
}
export interface Access {
  userId: string;
  accessEnabled: boolean;
  policyVersion: number;
  updatedAt: string | null;
  rowVersion: string | null;
}
export interface AccessEvent extends Record<string, unknown> {
  auditEventId: string;
  actorId: string;
  actor: string;
  action: string;
  userId: string;
  before: unknown;
  after: unknown;
  occurredAt: string;
}
export interface ReviewCommand {
  reviewId: string;
  status: ReviewStatus;
  classification: string | null;
  flags: string[];
  comment: string | null;
}
export interface AccessCommand {
  accessEnabled: boolean;
  reason: string;
  expectedRowVersion: string | null;
}
export interface UserQuery extends PageQuery {
  query?: string;
  accessEnabled?: boolean;
  from?: string;
  to?: string;
}
