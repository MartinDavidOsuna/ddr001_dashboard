<script setup lang="ts">
import { computed } from "vue";
import { label } from "./diagnostics.format";
const props = defineProps<{ value?: string | null }>();
const tone = computed(() =>
  [
    "COMPROMISED",
    "MISMATCH",
    "CORRUPT",
    "RECHAZADO",
    "RECHAZA",
    "FAIL",
    "INVALID_EVIDENCE",
  ].includes(props.value ?? "")
    ? "danger"
    : ["OK", "VERIFIED", "APROBADO", "APRUEBA", "PASS", "RESOLVED"].includes(
          props.value ?? "",
        )
      ? "success"
      : ["SIMULATION", "FLAGGED", "NO_CONCLUYENTE"].includes(props.value ?? "")
        ? "warning"
        : "neutral",
);
</script>
<template>
  <span class="diag-badge" :class="tone">{{ label(value) }}</span>
</template>
