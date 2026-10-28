import { api } from "@/api/client";
import { assertContract } from "./cabinets.contract";
import type {
  CabinetAdminSummary,
  CabinetAdminMetrics,
  CabinetAdminList,
  CabinetAdminDossier,
  CabinetAdminMap,
  CabinetAdminOptions,
  CabinetAdminEditRequest,
  CabinetAdminCancelRequest,
  CabinetAdminDeleteRequest,
  CabinetAdminMutationResult,
} from "./cabinets.generated";
export const cabinetsRoot = "/admin/dashboard/construction/cabinets";
export type CabinetParams = {
  missingPartCode?: string;
  search?: string;
  uid?: string;
  accountNumber?: string;
  status?: string;
  model?: string;
  automated?: string;
  crewId?: string;
  baseSurveyId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};
async function get<T>(
  path: string,
  schema: Parameters<typeof assertContract>[0],
  params: object,
  signal?: AbortSignal,
) {
  return assertContract<T>(
    schema,
    (await api.get<unknown>(cabinetsRoot + path, { params, signal })).data,
  );
}
export const cabinetsApi = {
  options: async () =>
    assertContract<CabinetAdminOptions>(
      "CabinetAdminOptions",
      (await api.get(cabinetsRoot + "/administration-options")).data,
    ),
  edit: async (id: string, body: CabinetAdminEditRequest) =>
    assertContract<CabinetAdminMutationResult>(
      "CabinetAdminMutationResult",
      (
        await api.patch(`${cabinetsRoot}/${encodeURIComponent(id)}`, body, {
          headers: { "Idempotency-Key": body.operationId },
        })
      ).data,
    ),
  cancelInstallation: async (id: string, body: CabinetAdminCancelRequest) =>
    assertContract<CabinetAdminMutationResult>(
      "CabinetAdminMutationResult",
      (
        await api.post(
          `${cabinetsRoot}/${encodeURIComponent(id)}/cancel-installation`,
          body,
          { headers: { "Idempotency-Key": body.operationId } },
        )
      ).data,
    ),
  delete: async (id: string, body: CabinetAdminDeleteRequest) =>
    assertContract<CabinetAdminMutationResult>(
      "CabinetAdminMutationResult",
      (
        await api.delete(`${cabinetsRoot}/${encodeURIComponent(id)}`, {
          data: body,
          headers: { "Idempotency-Key": body.operationId },
        })
      ).data,
    ),
  summary: (params: CabinetParams = {}, signal?: AbortSignal) =>
    get<CabinetAdminSummary>("/summary", "CabinetAdminSummary", params, signal),
  metrics: (params: CabinetParams = {}, signal?: AbortSignal) =>
    get<CabinetAdminMetrics>("/metrics", "CabinetAdminMetrics", params, signal),
  list: (params: CabinetParams = {}, signal?: AbortSignal) =>
    get<CabinetAdminList>("", "CabinetAdminList", params, signal),
  detail: (id: string, signal?: AbortSignal) =>
    get<CabinetAdminDossier>(
      `/${encodeURIComponent(id)}`,
      "CabinetAdminDossier",
      {},
      signal,
    ),
  map: (
    params: CabinetParams & {
      north?: number;
      south?: number;
      east?: number;
      west?: number;
      limit?: number;
    },
    signal?: AbortSignal,
  ) => get<CabinetAdminMap>("/map", "CabinetAdminMap", params, signal),
  photo: async (url: string, signal?: AbortSignal) => {
    // Only relative administrative URLs emitted by this contract; never attach credentials to arbitrary hosts.
    if (
      !/^\/api\/v1\/admin\/dashboard\/construction\/cabinets\/[\da-f-]+\/photos\/[\da-f-]+\/(thumbnail|content)$/i.test(
        url,
      )
    )
      throw new Error("Invalid administrative photo URL");
    return (
      await api.get<Blob>(url.slice("/api/v1".length), {
        responseType: "blob",
        signal,
      })
    ).data;
  },
};
