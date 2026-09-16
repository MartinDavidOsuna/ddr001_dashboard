<script setup lang="ts">
import { computed, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import {
  canReview,
  date,
  diagnosticError,
  errorCode,
  reviewUuid,
} from "./diagnostics.format";
import type { Review, ReviewCommand, ReviewStatus } from "./diagnostics.types";
import DiagnosticBadge from "./DiagnosticBadge.vue";
const props = defineProps<{ caseId: string; reviews: Review[] }>(),
  emit = defineEmits<{ saved: [] }>(),
  auth = useAuthStore();
const status = ref<ReviewStatus>("REVIEWED"),
  classification = ref(""),
  flags = ref(""),
  comment = ref(""),
  busy = ref(false),
  error = ref(""),
  success = ref("");
let previousPayload = "",
  commandId = "";
const parsedFlags = computed(() =>
  flags.value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
);
async function save() {
  if (!canReview(auth.user?.role) || busy.value) return;
  error.value = "";
  success.value = "";
  if (
    parsedFlags.value.length > 20 ||
    parsedFlags.value.some((x) => x.length > 80)
  ) {
    error.value = "Máximo 20 flags, de hasta 80 caracteres cada uno.";
    return;
  }
  const payload = {
    status: status.value,
    classification: classification.value.trim() || null,
    flags: parsedFlags.value,
    comment: comment.value.trim() || null,
  };
  const key = JSON.stringify(payload);
  if (key !== previousPayload) {
    commandId = reviewUuid();
    previousPayload = key;
  }
  busy.value = true;
  try {
    await diagnosticsApi.createReview(props.caseId, {
      ...payload,
      reviewId: commandId,
    } satisfies ReviewCommand);
    success.value = "Revisión registrada.";
    previousPayload = "";
    emit("saved");
  } catch (e) {
    error.value =
      errorCode(e) === "REVIEW_CONFLICT"
        ? "El identificador ya existe con otro contenido. Consulta el historial antes de crear una nueva revisión."
        : diagnosticError(e);
    if (errorCode(e) === "REVIEW_CONFLICT") previousPayload = "";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="card diag-stack">
    <h2>Revisión administrativa</h2>
    <p v-if="!reviews.length" class="diag-muted">
      Sin revisiones administrativas.
    </p>
    <ol class="diag-history">
      <li v-for="r in reviews" :key="r.reviewId">
        <DiagnosticBadge :value="r.status" />
        <strong>{{ r.reviewedByName }}</strong>
        <p>
          {{ date(r.reviewedAt) }} ·
          {{ r.classification || "Sin clasificación" }}
        </p>
        <p>{{ r.comment }}</p>
        <div class="diag-actions">
          <span
            v-for="flag in r.flags"
            :key="flag"
            class="diag-badge warning"
            >{{ flag }}</span
          >
        </div>
        <details>
          <summary>Identificadores</summary>
          {{ r.reviewId }} · {{ r.reviewedBy }}
        </details>
      </li>
    </ol>
    <form
      v-if="canReview(auth.user?.role)"
      class="diag-stack"
      @submit.prevent="save"
    >
      <fieldset :disabled="busy" class="diag-filters">
        <label
          >Estado de revisión<select v-model="status">
            <option value="PENDING">Pendiente</option>
            <option value="REVIEWED">Revisado</option>
            <option value="FLAGGED">Marcado</option>
            <option value="RESOLVED">Resuelto</option>
          </select></label
        >
        <label
          >Clasificación<input v-model="classification" maxlength="80" /></label
        ><label>Flags separados por comas<input v-model="flags" /></label>
        <label
          >Comentario<textarea v-model="comment" maxlength="2000" rows="3" />
        </label>
      </fieldset>
      <p v-if="error" role="alert" class="diag-alert">{{ error }}</p>
      <p v-if="success" role="status">{{ success }}</p>
      <button class="btn btn-primary" :disabled="busy">
        {{ busy ? "Guardando…" : "Registrar revisión" }}
      </button>
    </form>
    <p v-else class="diag-muted">
      Consulta de revisiones: acceso de sólo lectura.
    </p>
  </section>
</template>
