import { api } from "@/api/client";
import { adaptDetail } from "./diagnostics.adapters";
import type {
  Access,
  AccessCommand,
  AccessEvent,
  CaseItem,
  CaseQuery,
  Metrics,
  MetricsQuery,
  Page,
  PageQuery,
  RawDetail,
  Report,
  Review,
  ReviewCommand,
  Summary,
  SummaryQuery,
  TrendMetric,
  Trends,
  User,
  UserQuery,
} from "./diagnostics.types";
export const diagnosticsRoot = "/admin/dashboard/functional-diagnostics";
const id = (value: string) => encodeURIComponent(value);
async function get<T>(
  path: string,
  params: object = {},
  signal?: AbortSignal,
): Promise<T> {
  return (
    await api.get<{ data: T }>(diagnosticsRoot + path, { params, signal })
  ).data.data;
}
const simulation = (params: SummaryQuery) => ({
  ...params,
  simulation: params.simulation ?? "exclude",
});
export const diagnosticsApi = {
  summary: (p: SummaryQuery = {}, s?: AbortSignal) =>
    get<Summary>("/summary", simulation(p), s),
  cases: (p: CaseQuery = {}, s?: AbortSignal) =>
    get<Page<CaseItem>>(
      "/cases",
      { limit: 25, sort: "createdAtDesc", ...simulation(p) },
      s,
    ),
  detail: async (caseId: string, s?: AbortSignal) =>
    adaptDetail(await get<RawDetail>(`/cases/${id(caseId)}`, {}, s)),
  metrics: (p: MetricsQuery = {}, s?: AbortSignal) =>
    get<Metrics>("/metrics", { groupBy: "day", ...simulation(p) }, s),
  trends: (p: MetricsQuery & { metric?: TrendMetric } = {}, s?: AbortSignal) =>
    get<Trends>(
      "/trends",
      { groupBy: "day", metric: "cases", ...simulation(p), timezone: "UTC" },
      s,
    ),
  users: (p: UserQuery = {}, s?: AbortSignal) =>
    get<Page<User>>("/users", { limit: 25, ...p }, s),
  access: (userId: string, s?: AbortSignal) =>
    get<Access>(`/users/${id(userId)}/access`, {}, s),
  updateAccess: async (userId: string, body: AccessCommand) =>
    (
      await api.put<{ data: Access }>(
        `${diagnosticsRoot}/users/${id(userId)}/access`,
        body,
      )
    ).data.data,
  accessHistory: (userId: string, p: PageQuery = {}, s?: AbortSignal) =>
    get<Page<AccessEvent>>(`/users/${id(userId)}/access-history`, p, s),
  reviews: (caseId: string, p: PageQuery = {}, s?: AbortSignal) =>
    get<Page<Review>>(`/cases/${id(caseId)}/reviews`, p, s),
  createReview: async (caseId: string, body: ReviewCommand) =>
    (
      await api.post<{ data: Review }>(
        `${diagnosticsRoot}/cases/${id(caseId)}/reviews`,
        body,
      )
    ).data.data,
  reports: (
    p: SummaryQuery &
      PageQuery & {
        caseId?: string;
        status?: "available" | "metadata_only";
      } = {},
    s?: AbortSignal,
  ) => get<Page<Report>>("/reports", simulation(p), s),
  report: (caseId: string, version?: number, s?: AbortSignal) =>
    get<Report>(`/cases/${id(caseId)}/report`, version ? { version } : {}, s),
  evidence: async (
    caseId: string,
    evidenceId: string,
    kind: "thumbnail" | "content",
    signal?: AbortSignal,
  ) =>
    (
      await api.get<Blob>(
        `${diagnosticsRoot}/cases/${id(caseId)}/evidence/${id(evidenceId)}/${kind}`,
        { responseType: "blob", signal },
      )
    ).data,
};
