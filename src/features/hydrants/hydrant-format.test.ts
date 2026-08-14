import { describe, expect, it } from 'vitest'
import type { HydrantMasterRecord } from '@/api/types'
import { evidenceLabel, hydrantAlerts, hydrantRvLabel, metadataEntries } from './hydrant-format'

const record = (overrides: Partial<HydrantMasterRecord> = {}): HydrantMasterRecord => ({
  hydrantId: 'h', accountNumber: '002', isActive: true, sourceType: 'catalog', createdAt: '', updatedAt: '',
  inspectionCount: 1, submittedCount: 1, validatedCount: 0, rejectedCount: 0, cancelledCount: 0,
  completeEvidenceCount: 1, rvStatus: 'completed', reviewed: true, mandatoryPhotosRequired: 7,
  mandatoryPhotosCompleted: 7, mandatoryPhotosComplete: true, totalPhotos: 9, additionalPhotos: 2,
  latitude: 22, longitude: -102, hasGps: true, hasSignal: true, ...overrides,
})

describe('hydrant master transformations', () => {
  it('distinguishes RV completion from the latest inspection and uses 7 + N evidence semantics', () => {
    expect(hydrantRvLabel('completed')).toBe('RV completado')
    expect(evidenceLabel(record())).toBe('7/7 obligatorias · 9 total')
  })
  it('does not present 0/7 as an error for a hydrant without inspections', () => {
    const empty = record({ inspectionCount: 0, mandatoryPhotosCompleted: undefined, totalPhotos: undefined })
    expect(evidenceLabel(empty)).toBe('Sin revisión')
    expect(hydrantAlerts(empty)).toContain('Nunca revisado')
  })
  it('derives only objective alerts', () => {
    expect(hydrantAlerts(record({ latitude: undefined, mandatoryPhotosComplete: false, hasGps: false }))).toEqual([
      'Sin coordenadas maestras', 'Última revisión con evidencias obligatorias incompletas', 'Última revisión sin captura GPS',
    ])
  })
  it('renders scalar metadata and preserves unknown objects for the technical JSON only', () => {
    expect(metadataEntries('{"origin":"xlsx","row":22,"nested":{"x":1}}')).toEqual([['origin', 'xlsx'], ['row', '22']])
    expect(metadataEntries('invalid')).toEqual([])
  })
})
