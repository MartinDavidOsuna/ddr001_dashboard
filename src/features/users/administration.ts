import { api } from '@/api/client'
export const administrationRoot = '/admin/dashboard/administration'
export interface AdministrativeRecord {
  id: string; name: string | null; rowVersion: string; isActive?: boolean; blocked?: boolean;
  status?: string; crewName?: string; clientApp?: string; model?: string; platform?: string;
  userCount?: number; openSessions?: number; inspectionCount?: number;
  startedAt?: string; endedAt?: string; lastSeenAt?: string;
  history?: AdministrativeHistory[];
}
export interface AdministrativeHistory { id: number; occurredAt: string; actor: string; action: string; beforeJson?: string; afterJson?: string }
export async function administrationCommand(path: string, body: unknown, method: 'post'|'put' = 'post') {
  return (await api[method](`${administrationRoot}/${path}`, body)).data
}
export function historyReason(value?: string) {
  try { return JSON.parse(value || '{}').reason || 'Sin motivo registrado' } catch { return 'Sin detalle disponible' }
}
