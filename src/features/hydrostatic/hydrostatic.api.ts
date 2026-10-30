import { api } from '@/api/client';
export const hydroBase='/admin/dashboard/construction/hydrostatic-tests';
export interface Attempt {
 testId:string;cabinetId:string|null;originCabinetId:string;uid:string;definitiveNumber:string|null;model:string;attemptNumber:number|null;
 actor:{id:string;name:string|null};startedAt:string|null;endedAt:string|null;durationMs:string|null;result:string;leakCount:number;evidenceCount:number;verifiedCount:number;errorCount:number;
 timeState:string;recoveryState:string;validationState:string;requiresReview:boolean;classification:string;serverVersion:number;sourceRevision:number;receivedAt:string;documentReceived:boolean;videoDeclaration:string;videoLinkState:string;videoDeclaredAt:string|null;videoDeclaredBy:string|null;
}
export interface Detail extends Attempt {location:{latitude:number;longitude:number;accuracy:number|null}|null;closedAt:string|null;discardedAt:string|null;leaks:{id:string;jointCode:string;pressureMillibar:number;description:string}[];pendingHistorySegments:number|null;videoPolicy:{linkingEnabled:boolean;code:string;message:string};notice:string}
export interface Evidence {id:string;role:string;byteLength:string;capturedAt:string;location:{latitude:number;longitude:number}|null;uploadState:string;integrityState:string;verified:boolean;thumbnailAvailable:boolean;joints:string[]}
export interface History {id:string;kind:string;action:string;beforeState:string|null;afterState:string|null;beforeVersion:number|null;afterVersion:number|null;occurredAt:string|null;receivedAt:string}
export interface Page<T>{items:T[];page:number;pageSize:number;total?:number;hasMore?:boolean}
export type MetricRow=Record<string,string|number|null>;
export interface Summary {attempts:number;cabinets:number;latestPass:number;latestLeak:number;discarded:number;pending:number;evidencePending:number;withVerifiedPhotos:number;requiresReview:number;averageDurationMs:number|null;averageAttempts:number|null;firstAttemptPassPercent:number|null;firstAttemptDenominator:number;firstAttemptPass:number;completedResults:number;leakAttempts:number;leakPercent:number|null;coverage:{classification:string;count:number}[];classificationWarning:string;definitions:Record<string,string>}
export interface Metrics {globalModalPressures?:number[];joints:{code:string;name:string;events:number;attempts:number;averageMillibar:number|null;modalPressures:{millibar:number;events:number}[]}[];pressures:{millibar:number;events:number;attempts:number}[];daily:MetricRow[];operators:MetricRow[];models:MetricRow[];cabinets:MetricRow[];multipleLeakAttempts:number;page:number;pageSize:number;definitions:Record<string,string>}
export type Filters=Record<string,string|number>;
async function get<T>(path:string,params?:Filters,signal?:AbortSignal){return(await api.get<T>(hydroBase+path,{params,signal})).data;}
export const hydroApi={
 summary:(p:Filters,s?:AbortSignal)=>get<Summary>('/summary',p,s),metrics:(p:Filters,s?:AbortSignal)=>get<Metrics>('/metrics',p,s),
 list:(p:Filters,s?:AbortSignal)=>get<Page<Attempt>>('/tests',p,s),cabinet:(id:string,p:Filters,s?:AbortSignal)=>get<Page<Attempt>>(`/cabinets/${encodeURIComponent(id)}/tests`,p,s),
 detail:(id:string,s?:AbortSignal)=>get<Detail>(`/tests/${encodeURIComponent(id)}`,undefined,s),
 history:(id:string,page=1,s?:AbortSignal)=>get<Page<History>>(`/tests/${encodeURIComponent(id)}/history`,{page,pageSize:25},s),
 evidences:(id:string,page=1,s?:AbortSignal)=>get<Page<Evidence>>(`/tests/${encodeURIComponent(id)}/evidences`,{page,pageSize:25},s),
 async photo(testId:string,evidenceId:string,variant:'original'|'thumbnail',signal?:AbortSignal){return(await api.get<Blob>(`${hydroBase}/tests/${encodeURIComponent(testId)}/evidences/${encodeURIComponent(evidenceId)}/${variant}`,{responseType:'blob',signal})).data;},
};
