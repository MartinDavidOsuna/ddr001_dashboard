import { describe, expect, it } from 'vitest'
import dataSourceSource from './construction.datasource.ts?raw'
import listViewSource from './ConstructionListView.vue?raw'
import detailViewSource from './ConstructionDetailView.vue?raw'
import dashboardSource from './ConstructionDashboardSection.vue?raw'
import userAccessSource from './ConstructionUserAccessCard.vue?raw'

const featureSources = {
  'construction.datasource.ts': dataSourceSource,
  'ConstructionListView.vue': listViewSource,
  'ConstructionDetailView.vue': detailViewSource,
  'ConstructionDashboardSection.vue': dashboardSource,
  'ConstructionUserAccessCard.vue': userAccessSource,
}

describe('Construction UI HTTP boundary', () => {
  it.each(Object.entries(featureSources))('%s does not import or invoke a Construction HTTP client', (_file, source) => {
    expect(source).not.toContain('@/api/client')
    expect(source).not.toContain('@/services/dashboard')
    expect(source).not.toMatch(/\baxios\b/)
    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toMatch(/['"`]\/[^'"`]*construction\//)
  })
})
