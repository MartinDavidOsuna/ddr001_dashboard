export type ConstructionRole = 'contractor' | 'resident' | 'admin' | 'superadmin'
export type SurveyStatus = 'created' | 'in_progress' | 'executed' | 'rejected' | 'accepted' | 'delivered'
export type ConstructionSyncState = 'pending' | 'syncing' | 'synchronized' | 'offline' | 'requires_review'
export type ConstructionPhotoPurpose = 'north' | 'east' | 'south' | 'west' | 'additional'
export type ConstructionIntegrityStatus = 'confirmed' | 'not_verified' | 'retry_required' | 'mapping_conflict'

export interface ConstructionLocation {
  latitude: number
  longitude: number
  accuracy: number
  capturedAt?: string
  altitude?: number | null
}

export interface ConstructionPhoto {
  id: string
  surveyId: string
  stepNumber?: number | null
  correctionRound?: number | null
  purpose?: ConstructionPhotoPurpose | null
  capturedAt: string
  location?: ConstructionLocation | null
  integrityStatus: ConstructionIntegrityStatus
  syncState: ConstructionSyncState
  thumbnailUrl?: string | null
  contentUrl?: string | null
}

export interface ConstructionStep {
  number: number
  name: string
  state: 'pending' | 'completed'
  completedAt?: string | null
  comment?: string | null
  photoIds: string[]
}

export interface ConstructionCorrection {
  id: string
  round: number
  rejectionReason: string
  contractorComment: string
  photoIds: string[]
  state: 'pending' | 'submitted' | 'resolved'
  createdAt: string
  submittedAt?: string | null
}

export interface ConstructionHistoryEntry {
  id: string
  fromStatus?: SurveyStatus | null
  toStatus: SurveyStatus | 'correction'
  actor: string
  actorType: 'contractor' | 'resident' | 'admin' | 'superadmin'
  timestamp: string
  reason?: string | null
}

export interface ConstructionAlert {
  id: string
  kind: 'review' | 'correction' | 'sync' | 'photos' | 'location' | 'evidence' | 'stalled'
  label: string
  severity: 'info' | 'warning' | 'danger'
}

export interface ConstructionSurvey {
  id: string
  displayIdentifier: string
  accountNumber?: string | null
  contractorName: string
  contractorUserId?: string | null
  companyName?: string | null
  crewId?: string | null
  createdAt: string
  updatedAt: string
  status: SurveyStatus
  syncState: ConstructionSyncState
  currentStep: number
  steps: ConstructionStep[]
  photos: ConstructionPhoto[]
  corrections: ConstructionCorrection[]
  history: ConstructionHistoryEntry[]
  canonicalLocation?: ConstructionLocation | null
  accountConflict?: boolean
  conflictingHydrantId?: string | null
  linkedHydrantId?: string | null
  rejectionReason?: string | null
  alerts: ConstructionAlert[]
}

export interface ConstructionUserAccess {
  userId: string
  role: ConstructionRole | null
  companyName?: string | null
  accessEnabled: boolean
  ownSurveyCount: number
  lastActivityAt?: string | null
}

export interface ConstructionFilters {
  status: 'all' | 'in_process' | SurveyStatus
  stage: 'all' | number
  contractor: 'all' | string
  company: 'all' | string
  dateFrom: string
  dateTo: string
  search: string
}

export interface ConstructionListRequest {
  page: number
  pageSize: number
  search?: string
  status?: SurveyStatus | 'in_process'
  stage?: number
  contractorId?: string
  crewId?: string
  from?: string
  to?: string
}

export interface ConstructionPage {
  items: ConstructionSurvey[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const constructionStepNames = [
  'Creación',
  'Preparación del terreno',
  'Cimbrado',
  'Armado',
  'Colado',
  'Descimbrado',
  'Terminado',
] as const

export const constructionStatusLabels: Record<SurveyStatus, string> = {
  created: 'Creado',
  in_progress: 'En proceso',
  executed: 'Ejecutado',
  rejected: 'Rechazado',
  accepted: 'Entregable',
  delivered: 'Entregado',
}

export const constructionRoleLabels: Record<ConstructionRole, string> = {
  contractor: 'Contratista',
  resident: 'Residente',
  admin: 'Administrador',
  superadmin: 'Superadministrador',
}

export const constructionPhotoPurposeLabels: Record<ConstructionPhotoPurpose, string> = {
  north: 'NORTE',
  east: 'ESTE',
  south: 'SUR',
  west: 'OESTE',
  additional: 'ADICIONAL',
}
