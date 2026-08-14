import type { HydrantMasterRecord } from '@/api/types'

export const hydrantRvLabel = (status: HydrantMasterRecord['rvStatus']) =>
  status === 'completed' ? 'RV completado' : 'Pendiente'

export function metadataEntries(value?: string): Array<[string, string]> {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return []
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== '' && typeof item !== 'object')
      .map(([key, item]) => [key, String(item)])
  } catch { return [] }
}

export function hydrantAlerts(record: HydrantMasterRecord): string[] {
  const alerts: string[] = []
  if (record.latitude == null || record.longitude == null) alerts.push('Sin coordenadas maestras')
  if (!record.inspectionCount) alerts.push('Nunca revisado')
  else {
    if (!record.mandatoryPhotosComplete) alerts.push('Última revisión con evidencias obligatorias incompletas')
    if (!record.hasGps) alerts.push('Última revisión sin captura GPS')
  }
  return alerts
}

export const evidenceLabel = (record: HydrantMasterRecord) => !record.inspectionCount
  ? 'Sin revisión'
  : `${record.mandatoryPhotosCompleted ?? 0}/${record.mandatoryPhotosRequired} obligatorias · ${record.totalPhotos ?? 0} total`
