<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import type { Evidence } from "./diagnostics.types";
import { canReview, diagnosticError } from "./diagnostics.format";
import DiagnosticBadge from "./DiagnosticBadge.vue";
import DiagnosticFields from "./DiagnosticFields.vue";
const props = defineProps<{ caseId: string; evidence: Evidence }>(),
  auth = useAuthStore();
const root = ref<HTMLElement>(),
  dialog = ref<HTMLDialogElement>(),
  url = ref(""),
  original = ref(""),
  error = ref(""),
  originalError = ref(""),
  loading = ref(false),
  originalLoading = ref(false);
const available = computed(
  () =>
    props.evidence.thumbnailAvailable &&
    props.evidence.integrityStatus === "VERIFIED",
);
let observer: IntersectionObserver | undefined;
const controller = new AbortController();
async function load() {
  if (loading.value || url.value || !available.value) return;
  loading.value = true;
  error.value = "";
  try {
    const blob = await diagnosticsApi.evidence(
      props.caseId,
      props.evidence.evidenceId,
      "thumbnail",
      controller.signal,
    );
    if (!controller.signal.aborted) url.value = URL.createObjectURL(blob);
  } catch (e) {
    if (!controller.signal.aborted) error.value = diagnosticError(e);
  } finally {
    loading.value = false;
  }
}
async function show() {
  if (
    !canReview(auth.user?.role) ||
    !props.evidence.contentAvailable ||
    props.evidence.integrityStatus !== "VERIFIED"
  )
    return;
  await nextTick();
  dialog.value?.showModal();
  originalLoading.value = true;
  originalError.value = "";
  try {
    const blob = await diagnosticsApi.evidence(
      props.caseId,
      props.evidence.evidenceId,
      "content",
      controller.signal,
    );
    if (!controller.signal.aborted && dialog.value?.open) {
      if (original.value) URL.revokeObjectURL(original.value);
      original.value = URL.createObjectURL(blob);
    }
  } catch (e) {
    if (!controller.signal.aborted) originalError.value = diagnosticError(e);
  } finally {
    originalLoading.value = false;
  }
}
function releaseOriginal() {
  if (original.value) URL.revokeObjectURL(original.value);
  original.value = "";
}
onMounted(() => {
  if (!available.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void load();
        observer?.disconnect();
      }
    },
    { rootMargin: "100px" },
  );
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => {
  controller.abort();
  observer?.disconnect();
  if (url.value) URL.revokeObjectURL(url.value);
  releaseOriginal();
});
</script>
<template>
  <article ref="root" class="diag-evidence card">
    <div class="diag-actions">
      <DiagnosticBadge :value="evidence.type" /><DiagnosticBadge
        :value="evidence.integrityStatus"
      />
    </div>
    <p
      v-if="['MISMATCH', 'CORRUPT'].includes(evidence.integrityStatus)"
      class="diag-alert"
    >
      Anomalía de integridad. Esta evidencia no se puede visualizar.
    </p>
    <img v-if="url" :src="url" :alt="`Evidencia ${evidence.type}`" />
    <p v-else-if="loading" role="status">Cargando evidencia…</p>
    <div v-else-if="error" role="alert">
      {{ error }} <button class="btn" @click="load">Reintentar imagen</button>
    </div>
    <p v-else-if="!available">Miniatura no disponible</p>
    <p v-else>Miniatura pendiente de carga</p>
    <button
      v-if="
        canReview(auth.user?.role) &&
        evidence.contentAvailable &&
        evidence.integrityStatus === 'VERIFIED'
      "
      class="btn"
      @click="show"
    >
      Ver original
    </button>
    <DiagnosticFields
      :value="evidence"
      :fields="[
        ['required', 'Obligatoria'],
        ['pointId', 'Punto asociado'],
        ['volumeRefL', 'Volumen patrón (L)'],
        ['pulseCount', 'Pulsos'],
        ['capturedAt', 'Captura'],
        ['uploadStatus', 'Carga'],
      ]"
    />
    <details>
      <summary>Integridad y metadatos de evidencia</summary>
      <DiagnosticFields :value="evidence" />
    </details>
    <dialog
      ref="dialog"
      class="diag-dialog"
      aria-label="Evidencia original"
      @close="releaseOriginal"
    >
      <button class="btn" @click="dialog?.close()">Cerrar imagen</button>
      <p v-if="originalLoading">Cargando original…</p>
      <div v-if="originalError" role="alert">
        {{ originalError }}
        <button class="btn" @click="show">Reintentar original</button>
      </div>
      <img v-if="original" :src="original" :alt="`Original ${evidence.type}`" />
    </dialog>
  </article>
</template>
