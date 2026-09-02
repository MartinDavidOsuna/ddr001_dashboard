import type { ConstructionFilters, ConstructionSurvey, SurveyStatus } from './construction.types'
import { constructionStepNames } from './construction.types'

export function isConstructionFinished(status: SurveyStatus): boolean {
  return status === 'executed' || status === 'accepted' || status === 'delivered'
}

export function constructionSummary(surveys: ConstructionSurvey[]) {
  const total = surveys.length
  const count = (status: SurveyStatus) => surveys.filter((survey) => survey.status === status).length
  const created = count('created')
  const inProgress = count('in_progress')
  const executed = count('executed')
  const rejected = count('rejected')
  const accepted = count('accepted')
  const delivered = count('delivered')
  const finished = surveys.filter((survey) => isConstructionFinished(survey.status)).length
  const photos = surveys.reduce((sum, survey) => sum + survey.photos.length, 0)
  const confirmedEvidence = surveys.reduce(
    (sum, survey) => sum + survey.photos.filter((photo) => photo.integrityStatus === 'confirmed').length,
    0,
  )
  return {
    total,
    created,
    inProgress,
    inProcess: created + inProgress,
    executed,
    rejected,
    accepted,
    delivered,
    finished,
    completionPercent: total === 0 ? 0 : Number(((finished / total) * 100).toFixed(1)),
    pendingReview: executed,
    photos,
    confirmedEvidence,
  }
}

export function stageDistribution(surveys: ConstructionSurvey[]) {
  return constructionStepNames.slice(1).map((name, index) => ({
    stage: index + 1,
    name,
    value: surveys.filter((survey) => survey.currentStep === index + 1).length,
  }))
}

export function statusDistribution(surveys: ConstructionSurvey[]) {
  const summary = constructionSummary(surveys)
  return [
    { name: 'En proceso', value: summary.inProcess },
    { name: 'Ejecutados', value: summary.executed },
    { name: 'Rechazados', value: summary.rejected },
    { name: 'Entregables', value: summary.accepted },
    { name: 'Entregados', value: summary.delivered },
  ]
}

export function productivityBy(surveys: ConstructionSurvey[], field: 'contractorName' | 'companyName') {
  const groups = new Map<string, ConstructionSurvey[]>()
  for (const survey of surveys) {
    const key = (survey[field] || 'Sin asignar').trim()
    groups.set(key, [...(groups.get(key) || []), survey])
  }
  return [...groups.entries()]
    .map(([name, items]) => ({
      name,
      total: items.length,
      finished: items.filter((item) => isConstructionFinished(item.status)).length,
      inProcess: items.filter((item) => item.status === 'created' || item.status === 'in_progress' || item.status === 'rejected').length,
    }))
    .sort((a, b) => b.total - a.total)
}

export function rejectionRate(surveys: ConstructionSurvey[]): number {
  const reviewed = surveys.filter((survey) => ['rejected', 'accepted', 'delivered'].includes(survey.status)).length
  const rejected = surveys.filter((survey) => survey.status === 'rejected' || survey.corrections.length > 0).length
  return reviewed === 0 ? 0 : Number(((rejected / reviewed) * 100).toFixed(1))
}

export function averageCycleDays(surveys: ConstructionSurvey[]): number {
  const values = surveys.flatMap((survey) => {
    const executedAt = survey.history.find((entry) => entry.toStatus === 'executed')?.timestamp
    if (!executedAt) return []
    const days = (new Date(executedAt).getTime() - new Date(survey.createdAt).getTime()) / 86_400_000
    return Number.isFinite(days) && days >= 0 ? [days] : []
  })
  if (!values.length) return 0
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

export function temporalActivity(surveys: ConstructionSurvey[]) {
  const buckets = new Map<string, { created: number; finished: number }>()
  for (const survey of surveys) {
    const createdKey = survey.createdAt.slice(0, 10)
    const created = buckets.get(createdKey) || { created: 0, finished: 0 }
    created.created += 1
    buckets.set(createdKey, created)
    const executedAt = survey.history.find((entry) => entry.toStatus === 'executed')?.timestamp
    if (executedAt) {
      const finishedKey = executedAt.slice(0, 10)
      const finished = buckets.get(finishedKey) || { created: 0, finished: 0 }
      finished.finished += 1
      buckets.set(finishedKey, finished)
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }))
}

function matchesStatus(survey: ConstructionSurvey, status: ConstructionFilters['status']) {
  if (status === 'all') return true
  if (status === 'in_process') return survey.status === 'created' || survey.status === 'in_progress'
  return survey.status === status
}

export function filterConstructionSurveys(surveys: ConstructionSurvey[], filters: ConstructionFilters) {
  const needle = filters.search.trim().toLocaleLowerCase('es-MX')
  return surveys.filter((survey) => {
    if (!matchesStatus(survey, filters.status)) return false
    if (filters.stage !== 'all' && survey.currentStep !== filters.stage) return false
    if (filters.contractor !== 'all' && survey.contractorName !== filters.contractor) return false
    if (filters.company !== 'all' && (survey.companyName || '') !== filters.company) return false
    if (filters.dateFrom && survey.createdAt.slice(0, 10) < filters.dateFrom) return false
    if (filters.dateTo && survey.createdAt.slice(0, 10) > filters.dateTo) return false
    if (!needle) return true
    return [survey.displayIdentifier, survey.accountNumber || '', survey.contractorName, survey.companyName || '']
      .join(' ')
      .toLocaleLowerCase('es-MX')
      .includes(needle)
  })
}
