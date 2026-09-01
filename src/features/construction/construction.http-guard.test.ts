import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const featureSources = [
  'construction.datasource.ts',
  'ConstructionListView.vue',
  'ConstructionDetailView.vue',
  'ConstructionDashboardSection.vue',
  'ConstructionUserAccessCard.vue',
]

describe('Construction UI HTTP boundary', () => {
  it.each(featureSources)('%s does not import or invoke a Construction HTTP client', (file) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    expect(source).not.toContain('@/api/client')
    expect(source).not.toContain('@/services/dashboard')
    expect(source).not.toMatch(/\baxios\b/)
    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toMatch(/['"`]\/[^'"`]*construction\//)
  })
})
