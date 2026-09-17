import { onBeforeUnmount, reactive } from "vue";
import axios from "axios";
import { loadMapLayer } from "./map.api.datasource";
import {
  domains,
  type Bounds,
  type Domain,
  type Filters,
  type LayerState,
} from "./map.types";
export function useMapLayers() {
  const empty = (): LayerState => ({
    items: [],
    loading: false,
    error: "",
    limit: 2000,
    truncated: false,
  });
  const state = reactive<Record<Domain, LayerState>>({
    hydrants: empty(),
    construction: empty(),
    diagnostics: empty(),
  });
  let generation = 0,
    controller: AbortController | undefined;
  async function load(
    active: Domain[],
    filters: Filters,
    bbox?: Bounds,
    reset = false,
  ) {
    controller?.abort();
    controller = new AbortController();
    const token = ++generation;
    for (const d of domains)
      Object.assign(state[d], {
        ...(reset || !active.includes(d) ? { items: [] } : {}),
        truncated: false,
        error: "",
        loading: active.includes(d),
      });
    await Promise.allSettled(
      active.map(async (d) => {
        try {
          const page = await loadMapLayer(d, filters, bbox, controller!.signal);
          if (token === generation) Object.assign(state[d], page);
        } catch (e) {
          if (token === generation && !axios.isCancel(e)) {
            // Manual refresh failures preserve the previously loaded snapshot.
            if (reset) state[d].items = [];
            state[d].error =
              axios.isAxiosError(e) && e.response?.status === 403
                ? "Tu rol no permite consultar esta capa."
                : "No fue posible consultar esta capa.";
          }
        } finally {
          if (token === generation) state[d].loading = false;
        }
      }),
    );
  }
  onBeforeUnmount(() => {
    generation++;
    controller?.abort();
  });
  return { state, load };
}
