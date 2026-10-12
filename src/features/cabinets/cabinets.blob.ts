import { onBeforeUnmount, ref } from "vue";
import axios from "axios";
import { cabinetsApi } from "./cabinets.api";
import { cabinetError } from "./cabinets.format";
export function useCabinetBlob() {
  const src = ref(""),
    loading = ref(false),
    error = ref("");
  let token = 0,
    controller: AbortController | undefined;
  function clear() {
    token++;
    controller?.abort();
    loading.value = false;
    error.value = "";
    if (src.value) URL.revokeObjectURL(src.value);
    src.value = "";
  }
  async function load(url: string) {
    clear();
    const generation = token;
    controller = new AbortController();
    loading.value = true;
    try {
      const blob = await cabinetsApi.photo(url, controller.signal);
      const objectUrl = URL.createObjectURL(blob);
      if (generation !== token) URL.revokeObjectURL(objectUrl);
      else src.value = objectUrl;
    } catch (cause) {
      if (generation === token && !axios.isCancel(cause))
        error.value = cabinetError(cause);
    } finally {
      if (generation === token) loading.value = false;
    }
  }
  onBeforeUnmount(clear);
  function fail() {
    clear();
    error.value = "No fue posible mostrar esta fotografía. Reintenta cargarla.";
  }
  return { src, loading, error, load, clear, fail };
}
