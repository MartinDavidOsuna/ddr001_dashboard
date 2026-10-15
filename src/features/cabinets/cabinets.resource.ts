import { onBeforeUnmount, ref, shallowRef } from "vue";
import axios from "axios";
import { cabinetError } from "./cabinets.format";
export function useCabinetResource<T>() {
  const data = shallowRef<T | null>(null),
    loading = ref(false),
    error = ref("");
  let generation = 0,
    controller: AbortController | undefined;
  function clear() {
    generation++;
    controller?.abort();
    data.value = null;
    loading.value = false;
    error.value = "";
  }
  async function load(request: (signal: AbortSignal) => Promise<T>) {
    controller?.abort();
    controller = new AbortController();
    const token = ++generation;
    data.value = null;
    error.value = "";
    loading.value = true;
    try {
      const result = await request(controller.signal);
      if (token === generation) data.value = result;
    } catch (cause) {
      if (token === generation && !axios.isCancel(cause)) {
        error.value = cabinetError(cause);
        if (import.meta.env.DEV) {
          // Never log the response/config/error object: it can contain tokens, SQL or paths.
          const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
          const title = axios.isAxiosError(cause) ? cause.response?.data?.title : undefined;
          const known = ['Cabinet projection unavailable', 'Cabinet projection incomplete', 'Historical policy unavailable'];
          console.debug('[Nuevos Hidrantes]', {
            status: status ?? null,
            kind: title && known.includes(title) ? title :
              cause instanceof Error && cause.message === 'CABINETS_CONTRACT_DRIFT' ? 'contract' :
                status ? 'http' : 'network-or-client',
          });
        }
      }
    } finally {
      if (token === generation) loading.value = false;
    }
  }
  onBeforeUnmount(() => {
    generation++;
    controller?.abort();
  });
  return { data, loading, error, load, clear };
}
