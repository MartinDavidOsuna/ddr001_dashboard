import { onBeforeUnmount, ref, shallowRef } from "vue";
import type { Page } from "./diagnostics.types";
import { diagnosticError } from "./diagnostics.format";
export function useCursor<T>(
  fetcher: (
    cursor: string | undefined,
    signal: AbortSignal,
  ) => Promise<Page<T>>,
) {
  const data = shallowRef<Page<T>>(),
    loading = ref(false),
    error = ref(""),
    history = ref<Array<string | undefined>>([undefined]);
  let controller: AbortController | undefined,
    epoch = 0;
  async function load() {
    controller?.abort();
    controller = new AbortController();
    const current = ++epoch;
    loading.value = true;
    error.value = "";
    data.value = undefined;
    try {
      const result = await fetcher(history.value.at(-1), controller.signal);
      if (current === epoch) data.value = result;
    } catch (e) {
      if (current === epoch && !controller.signal.aborted)
        error.value = diagnosticError(e);
    } finally {
      if (current === epoch) loading.value = false;
    }
  }
  function reset() {
    history.value = [undefined];
    return load();
  }
  function next() {
    if (data.value?.page.nextCursor) {
      history.value.push(data.value.page.nextCursor);
      return load();
    }
  }
  function previous() {
    if (history.value.length > 1) {
      history.value.pop();
      return load();
    }
  }
  onBeforeUnmount(() => {
    epoch++;
    controller?.abort();
  });
  return { data, loading, error, history, load, reset, next, previous };
}
