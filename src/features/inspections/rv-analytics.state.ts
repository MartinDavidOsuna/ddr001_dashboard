import { onBeforeUnmount, ref, shallowRef } from 'vue';
import axios from 'axios';
import { dashboardService } from '@/services/dashboard';
import { problemMessage } from '@/api/client';
import type { AnalyticsQuery, RvAnalyticsResponse } from './rv-analytics.types';
export function analyticsError(cause: unknown) {
  if (axios.isAxiosError(cause)) {
    if (cause.response?.status === 422) return 'El rango seleccionado es demasiado amplio. Reduce el periodo o aplica filtros.';
    if (cause.response?.status === 503) return 'Los datos RV no están disponibles: una versión de la información requiere revisión técnica. Intenta de nuevo más tarde.';
    if (cause.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    if (cause.response?.status === 403) return 'No tienes permiso para consultar el análisis RV.';
  }
  return problemMessage(cause, 'No fue posible cargar el análisis RV.');
}
export function useRvAnalytics() {
  const data = shallowRef<RvAnalyticsResponse>();
  const loading = ref(false), error = ref('');
  let generation = 0, controller: AbortController | undefined, pendingKey = '';
  async function load(query: AnalyticsQuery) {
    const key = JSON.stringify(query);
    if (loading.value && key === pendingKey) return;
    controller?.abort(); controller = new AbortController();
    const current = ++generation; pendingKey = key; loading.value = true; error.value = '';
    try {
      const result = await dashboardService.rvAnalytics(query, controller.signal);
      if (current === generation) data.value = result;
    } catch (cause) {
      if (current === generation && !axios.isCancel(cause)) error.value = analyticsError(cause);
    } finally { if (current === generation) loading.value = false; }
  }
  onBeforeUnmount(() => { generation++; controller?.abort(); });
  return { data, loading, error, load };
}
export function localDateRange(from: string, to: string) {
  return {
    ...(from ? { from: new Date(from + 'T00:00:00-07:00').toISOString() } : {}),
    ...(to ? { to: new Date(new Date(to + 'T00:00:00-07:00').getTime() + 86_400_000).toISOString() } : {}),
  };
}
