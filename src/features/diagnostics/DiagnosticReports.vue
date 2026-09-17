<script setup lang="ts">
import { watch } from "vue";
import type { SummaryQuery } from "./diagnostics.types";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import { useCursor } from "./diagnostics.cursor";
import { date } from "./diagnostics.format";
const props = defineProps<{ filters: SummaryQuery }>();
const list = useCursor((cursor, signal) =>
  diagnosticsApi.reports(
    {
      simulation: props.filters.simulation,
      from: props.filters.from,
      to: props.filters.to,
      userId: props.filters.userId,
      cursor,
      limit: 25,
    },
    signal,
  ),
);
watch(() => props.filters, list.reset, { deep: true, immediate: true });
</script>
<template>
  <section class="card diag-stack">
    <h2>Reportes registrados</h2>
    <p class="diag-note">
      Archivos HTML/PDF no expuestos por el API administrativo actual. El filtro
      de banco no aplica a este endpoint.
    </p>
    <p v-if="list.loading.value">Cargando reportes…</p>
    <div v-else-if="list.error.value" role="alert" class="diag-alert">
      {{ list.error.value }}
      <button class="btn" @click="list.load">Reintentar reportes</button>
    </div>
    <template v-else-if="list.data.value"
      ><p v-if="!list.data.value.items.length">Sin reportes registrados.</p>
      <div v-else class="diag-scroll">
        <table>
          <thead>
            <tr>
              <th>Caso</th>
              <th>Versión</th>
              <th>Generado</th>
              <th>Recibido</th>
              <th>HTML / PDF</th>
              <th>Checksum</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list.data.value.items" :key="r.reportId">
              <td>
                <RouterLink :to="`/diagnosticos/${r.caseId}`">{{
                  r.meterId || r.caseId
                }}</RouterLink>
              </td>
              <td>{{ r.version }}</td>
              <td>{{ date(r.createdAt) }}</td>
              <td>{{ date(r.receivedAt) }}</td>
              <td>
                {{ r.htmlAvailable ? "Registrado" : "No disponible" }} /
                {{ r.pdfAvailable ? "Registrado" : "No disponible" }}
              </td>
              <td>
                <code>{{ r.checksum }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="diag-pagination">
        <button
          class="btn"
          :disabled="list.history.value.length === 1"
          @click="list.previous"
        >
          Anterior</button
        ><button
          class="btn"
          :disabled="!list.data.value.page.nextCursor"
          @click="list.next"
        >
          Siguiente
        </button>
      </div></template
    >
  </section>
</template>
