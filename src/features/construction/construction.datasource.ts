import { constructionSurveys } from './construction.mock'
import type { ConstructionSurvey } from './construction.types'

export interface ConstructionDataSource {
  list(): Promise<ConstructionSurvey[]>
  getById(surveyId: string): Promise<ConstructionSurvey | null>
}

function cloneSurvey<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const mockConstructionDataSource: ConstructionDataSource = {
  async list() {
    return cloneSurvey(constructionSurveys)
  },
  async getById(surveyId: string) {
    const survey = constructionSurveys.find((item) => item.id === surveyId)
    return survey ? cloneSurvey(survey) : null
  },
}

export const constructionDataSource: ConstructionDataSource = mockConstructionDataSource
export const CONSTRUCTION_DATA_MODE = 'UI_PREVIEW_MOCK' as const
