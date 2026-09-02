import { api } from '@/api/client'
import type { ConstructionRole, ConstructionUserAccess } from './construction.types'
export async function getConstructionAccess(userId:string):Promise<ConstructionUserAccess>{const d=(await api.get(`/admin/dashboard/construction/users/${userId}/access`)).data;return{userId:d.userId,role:d.constructionRole,companyName:d.crewName,accessEnabled:d.accessEnabled,ownSurveyCount:Number(d.ownSurveyCount),lastActivityAt:d.lastConstructionActivityAt}}
export async function updateConstructionAccess(userId:string,role:ConstructionRole|null){await api.put(`/admin/dashboard/construction/users/${userId}/access`,{role,reason:'Actualización desde dashboard administrativo'})}
export interface ConstructionAccessHistoryItem{auditId:string;actorId:string;actor:string;timestamp:string;before:{role?:ConstructionRole|null}|null;after:{role?:ConstructionRole|null;reason?:string}|null;reason:string|null}
export async function getConstructionAccessHistory(userId:string){return(await api.get<{items:ConstructionAccessHistoryItem[]}>(`/admin/dashboard/construction/users/${userId}/access-history`)).data.items}
