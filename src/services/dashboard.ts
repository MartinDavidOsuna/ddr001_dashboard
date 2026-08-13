import { api } from '@/api/client'
import type { DashboardSummary, FilterOption, InspectionDetail, InspectionFilters, InspectionListItem, Page } from '@/api/types'
export const dashboardService = {
  async summary() { return (await api.get<DashboardSummary>('/admin/dashboard/summary')).data },
  async filters() { return (await api.get<{ technicians: FilterOption[]; crews: FilterOption[]; statuses: string[] }>('/admin/dashboard/filters')).data },
  async inspections(filters: InspectionFilters) { return (await api.get<Page<InspectionListItem>>('/admin/dashboard/inspections', { params: filters })).data },
  async inspection(id: string) { return (await api.get<InspectionDetail>(`/admin/dashboard/inspections/${id}`)).data },
  async photo(url: string) { return URL.createObjectURL((await api.get<Blob>(url, { responseType: 'blob', timeout: 30_000 })).data) },
}

