import { constructionSurveys } from './construction.mock'
import { apiConstructionDataSource } from './construction.api.datasource'
import type { ConstructionListRequest, ConstructionPage, ConstructionSurvey } from './construction.types'

export interface ConstructionDataSource {
  list(): Promise<ConstructionSurvey[]>
  getById(surveyId: string): Promise<ConstructionSurvey | null>
  listPage?(request: ConstructionListRequest): Promise<ConstructionPage>
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

const apiMode=import.meta.env.VITE_CONSTRUCTION_DATA_MODE==='api'
export const constructionDataSource: ConstructionDataSource = apiMode ? apiConstructionDataSource : mockConstructionDataSource
export const CONSTRUCTION_DATA_MODE = apiMode ? 'API_REAL' : 'UI_PREVIEW_MOCK'
