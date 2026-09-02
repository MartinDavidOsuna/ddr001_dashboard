import { describe, expect, it } from 'vitest'
import { constructionSurveys } from './construction.mock'
import { averageCycleDays, constructionSummary, filterConstructionSurveys, rejectionRate, stageDistribution, statusDistribution } from './construction.metrics'
import type { ConstructionFilters } from './construction.types'

const allFilters: ConstructionFilters = { status: 'all', stage: 'all', contractor: 'all', company: 'all', dateFrom: '', dateTo: '', search: '' }

describe('construction metrics', () => {
  it('aggregates all functional statuses without mixing RV data', () => {
    const summary = constructionSummary(constructionSurveys)
    expect(summary.total).toBe(8)
    expect(summary.inProcess).toBe(3)
    expect(summary.executed).toBe(2)
    expect(summary.rejected).toBe(1)
    expect(summary.accepted).toBe(1)
    expect(summary.delivered).toBe(1)
    expect(summary.photos).toBeGreaterThan(0)
  })

  it('never divides by zero', () => {
    const summary = constructionSummary([])
    expect(summary.completionPercent).toBe(0)
    expect(rejectionRate([])).toBe(0)
    expect(averageCycleDays([])).toBe(0)
  })

  it('builds status and six-stage distributions', () => {
    expect(statusDistribution(constructionSurveys).map((item) => item.name)).toEqual(['En proceso', 'Ejecutados', 'Rechazados', 'Entregables', 'Entregados'])
    expect(stageDistribution(constructionSurveys)).toHaveLength(6)
  })

  it('filters by status, stage and search fields', () => {
    expect(filterConstructionSurveys(constructionSurveys, { ...allFilters, status: 'rejected' })).toHaveLength(1)
    expect(filterConstructionSurveys(constructionSurveys, { ...allFilters, stage: 4 }).every((survey) => survey.currentStep === 4)).toBe(true)
    expect(filterConstructionSurveys(constructionSurveys, { ...allFilters, search: 'Constructora Delta' }).length).toBeGreaterThan(0)
    expect(filterConstructionSurveys(constructionSurveys, { ...allFilters, search: 'DEMO-1005' }).some((survey) => survey.accountNumber === 'DEMO-1005')).toBe(true)
  })
})
