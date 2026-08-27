export type AdminRole = "admin" | "supervisor" | "viewer";
export interface AuthClaims {
  kind: "admin";
  userId: string;
  role: AdminRole;
  tokenId: string;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: unknown[];
}
export interface Page<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}
export interface DashboardSummary {
  totalHydrants: number;
  reviewedHydrants: number;
  pendingHydrants: number;
  progressPercent: number;
  totalInspections: number;
  inspectionsToday: number;
  verifiedPhotos: number;
  byStatus: { status: string; count: number }[];
  activity: { date: string; count: number }[];
  byTechnician: { userId: string; name: string; count: number }[];
}
export interface FilterOption {
  id: string;
  label: string;
}
export interface InspectionFilters {
  page: number;
  pageSize: number;
  search?: string;
  userId?: string;
  crewId?: string;
  status?: string;
  from?: string;
  to?: string;
  gps?: "present" | "absent";
}
export interface InspectionListItem {
  inspectionId: string;
  hydrantId: string;
  accountNumber: string;
  technicianId: string;
  technicianName: string;
  crewId?: string;
  crewName?: string;
  startedAt: string;
  submittedAt?: string;
  updatedAt: string;
  revisionNumber: number;
  status: string;
  mandatoryPhotosCompleted: number;
  mandatoryPhotosRequired: number;
  mandatoryPhotosMissing: number;
  mandatoryPhotosComplete: boolean;
  additionalPhotos: number;
  totalPhotos: number;
  hasGps: boolean;
  gpsAccuracyM?: number;
  hasSignal: boolean;
  signalGeneration?: string;
  signalDbm?: number;
}
export interface ChecklistItem {
  sectionId: string;
  sectionCode: string;
  sectionTitle: string;
  sectionOrder: number;
  itemId: string;
  itemCode: string;
  label: string;
  fieldType: string;
  itemOrder: number;
  isRequired: boolean;
  unit?: string;
  optionsJson?: string;
  dependencyItemCode?: string;
  dependencyOperator?: string;
  dependencyValue?: string;
  photoSlotCode?: string;
  helpText?: string;
  answerId?: string;
  valueText?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueJson?: string;
  isNotApplicable: boolean;
  answerCapturedAt?: string;
  answerUpdatedAt?: string;
}
export interface Photo {
  photoId: string;
  checklistItemId?: string;
  slotCode: string;
  slotLabel?: string;
  mimeType: string;
  byteSize: number;
  widthPx?: number;
  heightPx?: number;
  uploadStatus: string;
  capturedAt: string;
  uploadedAt?: string;
  verifiedAt?: string;
  slotOrdinal: number;
  isMandatory: boolean;
  category: "mandatory" | "additional";
  thumbnailUrl: string;
  contentUrl: string;
}
export interface GalleryPhoto extends Photo {
  inspectionId: string;
  hydrantId: string;
  accountNumber: string;
  revisionNumber: number;
  technicianName: string;
  crewName?: string;
}
export interface PhotoSlotOption {
  slotCode: string;
  label: string;
  count: number;
}
export interface GalleryFilterOption extends FilterOption {
  count: number;
}
export interface GalleryStatusOption {
  status: "received" | "processing" | "verified" | "rejected" | "missing";
  count: number;
}
export interface GalleryFilters {
  page: number;
  pageSize: number;
  search?: string;
  slotCode?: string;
  category?: "mandatory" | "additional";
  technicianId?: string;
  crewId?: string;
  uploadStatus?: GalleryStatusOption["status"];
  from?: string;
  to?: string;
}
export interface LocationSample {
  latitude: number;
  longitude: number;
  altitudeM?: number;
  horizontalAccuracyM?: number;
  verticalAccuracyM?: number;
  utmZone?: string;
  utmEasting?: number;
  utmNorthing?: number;
  source: string;
  capturedAt: string;
  receivedAt: string;
}
export interface SignalSample {
  generation?: string;
  networkType?: string;
  carrierName?: string;
  dbm?: number;
  level?: number;
  isRoaming?: boolean;
  isConnected: boolean;
  capturedAt: string;
  receivedAt: string;
  rawJson?: string;
}
export interface HistoryEntry {
  statusHistoryId: number;
  previousStatus?: string;
  newStatus: string;
  actorType: string;
  actorId?: string;
  actorName?: string;
  comment?: string;
  occurredAt: string;
}
export interface AuditEntry {
  auditId: number;
  occurredAt: string;
  actorType: string;
  actorId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: string;
  afterJson?: string;
  requestId?: string;
}
export interface InspectionDetail {
  inspectionId: string;
  clientInspectionId: string;
  inspectionType: string;
  revisionNumber: number;
  status: string;
  generalComments?: string;
  startedAt: string;
  submittedAt?: string;
  validatedAt?: string;
  cancelledAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
  cancellationReason?: string;
  rejectionCode?: string;
  createdAt: string;
  updatedAt: string;
  hydrantId: string;
  accountNumber: string;
  installationYear?: number;
  flowLps?: number;
  masterLatitude?: number;
  masterLongitude?: number;
  sourceX?: number;
  sourceY?: number;
  sourceCrs?: string;
  sourceType: string;
  technicianId: string;
  technicianName: string;
  crewId?: string;
  crewName?: string;
  deviceId?: string;
  platform?: string;
  manufacturer?: string;
  model?: string;
  osVersion?: string;
  appVersion?: string;
  checklistVersionId: string;
  checklistCode: string;
  checklistVersion: number;
  checklistTitle: string;
  checklistPublishedAt?: string;
  checklistItems: ChecklistItem[];
  mandatoryPhotosRequired: number;
  mandatoryPhotosCompleted: number;
  mandatoryPhotosMissing: string[];
  mandatoryPhotosComplete: boolean;
  additionalPhotos: number;
  totalPhotos: number;
  location?: LocationSample;
  signal?: SignalSample;
  photos: Photo[];
  history: HistoryEntry[];
  audit: AuditEntry[];
}
export type HydrantRvStatus = "pending" | "completed";
export interface HydrantFilters {
  page: number;
  pageSize: 25 | 50 | 100;
  search?: string;
  rvStatus?: HydrantRvStatus;
  reviewed?: boolean;
  hasInspections?: boolean;
  installationYear?: number;
  flowMin?: number;
  flowMax?: number;
  outletCount?: number;
  coordinates?: "present" | "absent";
  lastFrom?: string;
  lastTo?: string;
  sort?:
    | "accountNumber"
    | "installationYear"
    | "flowLps"
    | "inspectionCount"
    | "lastInspectionAt";
  direction?: "asc" | "desc";
}
export interface HydrantMasterRecord {
  hydrantId: string;
  accountNumber: string;
  installationYear?: number;
  flowLps?: number;
  sourceX?: number;
  sourceY?: number;
  sourceCrs?: string;
  latitude?: number;
  longitude?: number;
  sectionCode?: string;
  installationAngleDeg?: number;
  elevationM?: number;
  outletCount?: number;
  metadataJson?: string;
  isActive: boolean;
  sourceType: "catalog" | "manual";
  createdAt: string;
  updatedAt: string;
  inspectionCount: number;
  firstInspectionAt?: string;
  submittedCount: number;
  validatedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  completeEvidenceCount: number;
  rvStatus: HydrantRvStatus;
  reviewed: boolean;
  latestInspectionId?: string;
  latestRevisionNumber?: number;
  latestInspectionStatus?: string;
  latestStartedAt?: string;
  latestSubmittedAt?: string;
  latestTechnicianName?: string;
  latestCrewName?: string;
  mandatoryPhotosCompleted?: number;
  mandatoryPhotosRequired: number;
  mandatoryPhotosMissing?: number;
  mandatoryPhotosComplete: boolean;
  additionalPhotos?: number;
  totalPhotos?: number;
  hasGps?: boolean;
  hasSignal?: boolean;
  lastInspectionAt?: string;
}
export interface HydrantInspectionHistoryItem {
  inspectionId: string;
  revisionNumber: number;
  status: string;
  startedAt: string;
  submittedAt?: string;
  validatedAt?: string;
  technicianName: string;
  crewName?: string;
  mandatoryPhotosCompleted: number;
  mandatoryPhotosRequired: number;
  mandatoryPhotosMissing: number;
  mandatoryPhotosComplete: boolean;
  additionalPhotos: number;
  totalPhotos: number;
  hasGps: boolean;
  hasSignal: boolean;
}

export type UserStatusFilter = "active" | "inactive";
export interface UserFilters {
  page: number;
  pageSize: 25 | 50 | 100;
  search?: string;
  crewId?: string;
  status?: UserStatusFilter;
  activity?: "with_inspections" | "without_inspections";
}
export interface DashboardUser {
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  employeeNumber?: string;
  isActive: boolean;
  crewId?: string;
  crewName?: string;
  inspectionCount: number;
  submittedCount: number;
  validatedCount: number;
  rejectedCount: number;
  sessionCount: number;
  activeSessionCount: number;
  deviceCount: number;
  firstActivityAt?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  rowVersion?: string;
}
export interface DashboardUserDetail extends DashboardUser {
  recentInspections: Array<{
    inspectionId: string;
    hydrantId: string;
    accountNumber: string;
    revisionNumber: number;
    status: string;
    startedAt: string;
  }>;
  recentSessions: Array<{
    workSessionId: string;
    status: string;
    crewId?: string;
    crewName?: string;
    startedAt: string;
    endedAt?: string;
  }>;
}
