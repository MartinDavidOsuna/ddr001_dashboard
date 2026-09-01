import type { ConstructionPhoto, ConstructionSurvey, ConstructionUserAccess, SurveyStatus } from './construction.types'
import { constructionStepNames } from './construction.types'

const companies = ['Constructora Delta', 'Infraestructura Norte', 'Obra Hidráulica Uno']
const contractors = ['Alex Rivera', 'Diana Torres', 'Marco Luna', 'Sofía Campos']
const statuses: SurveyStatus[] = ['created', 'in_progress', 'executed', 'rejected', 'accepted', 'delivered', 'in_progress', 'executed']
const stages = [0, 2, 6, 6, 6, 6, 4, 6]

function date(day: number, hour = 9) {
  return `2026-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00-06:00`
}

function photos(surveyId: string, currentStep: number, index: number): ConstructionPhoto[] {
  if (currentStep === 0) return []
  const out: ConstructionPhoto[] = []
  for (let step = 1; step <= currentStep; step += 1) {
    const count = step === 6 ? 4 : Math.min(2, 1 + ((step + index) % 2))
    for (let i = 0; i < count; i += 1) {
      const purposes = ['north', 'east', 'south', 'west'] as const
      out.push({
        id: `${surveyId}-p-${step}-${i}`,
        surveyId,
        stepNumber: step,
        purpose: step === 6 ? purposes[i] ?? 'additional' : null,
        capturedAt: date(11 + index + step, 10 + i),
        location: { latitude: 29.08 + index * 0.008, longitude: -110.95 + index * 0.006, accuracy: 3.8 + i, capturedAt: date(11 + index + step, 10 + i) },
        integrityStatus: index === 6 && step === currentStep && i === 0 ? 'not_verified' : 'confirmed',
        syncState: index === 1 && step === currentStep ? 'pending' : 'synchronized',
      })
    }
  }
  return out
}

export const constructionSurveys: ConstructionSurvey[] = statuses.map((status, index) => {
  const id = `mock-survey-${index + 1}`
  const currentStep = stages[index] ?? 0
  const surveyPhotos = photos(id, currentStep, index)
  const rejected = status === 'rejected'
  const corrections = rejected || index === 5 ? [{
    id: `${id}-correction-1`, round: 1, rejectionReason: 'Ajustar acabado lateral y documentar corrección.', contractorComment: rejected ? 'Corrección en preparación.' : 'Corrección atendida y documentada.',
    photoIds: surveyPhotos.slice(-1).map((photo) => photo.id), state: rejected ? 'pending' as const : 'resolved' as const, createdAt: date(22 + index), submittedAt: rejected ? null : date(23 + index),
  }] : []
  const steps = constructionStepNames.slice(1).map((name, stepIndex) => {
    const number = stepIndex + 1
    const done = number <= currentStep
    return { number, name, state: done ? 'completed' as const : 'pending' as const, completedAt: done ? date(12 + index + number) : null, comment: done ? `Etapa ${name.toLocaleLowerCase('es-MX')} documentada.` : null, photoIds: surveyPhotos.filter((photo) => photo.stepNumber === number).map((photo) => photo.id) }
  })
  const history = [
    { id: `${id}-h-1`, fromStatus: null, toStatus: 'created' as const, actor: contractors[index % contractors.length]!, actorType: 'contractor' as const, timestamp: date(10 + index) },
    ...(currentStep > 0 ? [{ id: `${id}-h-2`, fromStatus: 'created' as const, toStatus: 'in_progress' as const, actor: contractors[index % contractors.length]!, actorType: 'contractor' as const, timestamp: date(11 + index) }] : []),
    ...(['executed', 'rejected', 'accepted', 'delivered'].includes(status) ? [{ id: `${id}-h-3`, fromStatus: 'in_progress' as const, toStatus: 'executed' as const, actor: contractors[index % contractors.length]!, actorType: 'contractor' as const, timestamp: date(20 + index) }] : []),
    ...(rejected ? [{ id: `${id}-h-4`, fromStatus: 'executed' as const, toStatus: 'rejected' as const, actor: 'Residente de prueba', actorType: 'resident' as const, timestamp: date(21 + index), reason: 'Ajustar acabado lateral y documentar corrección.' }] : []),
    ...(status === 'accepted' || status === 'delivered' ? [{ id: `${id}-h-4`, fromStatus: 'executed' as const, toStatus: 'accepted' as const, actor: 'Residente de prueba', actorType: 'resident' as const, timestamp: date(24 + index) }] : []),
    ...(status === 'delivered' ? [{ id: `${id}-h-5`, fromStatus: 'accepted' as const, toStatus: 'delivered' as const, actor: 'Residente de prueba', actorType: 'resident' as const, timestamp: date(25 + index) }] : []),
  ]
  const alerts = [
    ...(status === 'executed' ? [{ id: `${id}-a-review`, kind: 'review' as const, label: 'Ejecutado pendiente de revisión', severity: 'info' as const }] : []),
    ...(rejected ? [{ id: `${id}-a-correction`, kind: 'correction' as const, label: 'Rechazado pendiente de corrección', severity: 'danger' as const }] : []),
    ...(index === 1 ? [{ id: `${id}-a-sync`, kind: 'sync' as const, label: 'Sincronización pendiente', severity: 'warning' as const }] : []),
    ...(index === 6 ? [{ id: `${id}-a-evidence`, kind: 'evidence' as const, label: 'Evidencia pendiente de confirmación', severity: 'warning' as const }] : []),
  ]
  return {
    id, displayIdentifier: `BASE DEMO ${String(index + 1).padStart(2, '0')}`, accountNumber: index === 0 ? null : `DEMO-${1000 + index}`, contractorName: contractors[index % contractors.length]!, contractorUserId: `mock-user-${(index % contractors.length) + 1}`,
    companyName: companies[index % companies.length]!, createdAt: date(10 + index), updatedAt: date(20 + index), status, syncState: index === 1 ? 'pending' : 'synchronized', currentStep, steps, photos: surveyPhotos, corrections, history,
    canonicalLocation: currentStep > 0 ? { latitude: 29.08 + index * 0.008, longitude: -110.95 + index * 0.006, accuracy: 4.2, capturedAt: date(11 + index) } : null,
    accountConflict: index === 4, conflictingHydrantId: index === 4 ? 'mock-linked-hydrant' : null, linkedHydrantId: null, rejectionReason: rejected ? 'Ajustar acabado lateral y documentar corrección.' : null, alerts,
  }
})

export const constructionUserAccess: ConstructionUserAccess[] = [
  { userId: 'mock-user-1', role: 'contractor', companyName: companies[0], accessEnabled: true, ownSurveyCount: 2, lastActivityAt: date(28) },
  { userId: 'mock-user-2', role: 'resident', companyName: null, accessEnabled: true, ownSurveyCount: 0, lastActivityAt: date(29) },
  { userId: 'mock-user-3', role: null, companyName: null, accessEnabled: false, ownSurveyCount: 0, lastActivityAt: null },
]

export function mockConstructionAccessFor(userId: string, index = 0): ConstructionUserAccess {
  return constructionUserAccess.find((entry) => entry.userId === userId) ?? {
    userId,
    role: index % 3 === 0 ? 'contractor' : index % 3 === 1 ? 'resident' : null,
    companyName: index % 3 === 0 ? companies[index % companies.length] : null,
    accessEnabled: index % 3 !== 2,
    ownSurveyCount: index % 3 === 0 ? 2 + (index % 4) : 0,
    lastActivityAt: index % 3 !== 2 ? date(27 - (index % 8)) : null,
  }
}
