<script setup lang="ts">
import { ref, watch } from "vue";
import { api, problemMessage } from '@/api/client';
import { saveExportBlob } from '@/features/exports/export-utils';
import { useAuthStore } from '@/stores/auth';
const auth=useAuthStore();
import type { SummaryQuery } from "./diagnostics.types";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import { useCursor } from "./diagnostics.cursor";
import { date } from "./diagnostics.format";
const props = defineProps<{ filters: SummaryQuery }>();
const downloading=ref(''),downloadError=ref('');
async function download(caseId:string,reportId:string,format:'html'|'pdf') {
  downloading.value=reportId;downloadError.value='';
  try {const r=await api.get<Blob>(`/admin/dashboard/functional-diagnostics/cases/${caseId}/reports/${reportId}/${format}`,{responseType:'blob'});saveExportBlob(r.data,`diagnostico-${reportId}.${format}`)}
  catch(e){downloadError.value=problemMessage(e,'No se pudo descargar el reporte. Comprueba su disponibilidad e intenta de nuevo.')}
  finally{downloading.value=''}
}
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
      Descarga de archivos registrados. El filtro de banco no aplica a esta consulta.
    </p>
    <p v-if="downloadError" role="alert">{{ downloadError }}</p>
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
                <button v-if="r.htmlAvailable" class="btn" :disabled="!!downloading||auth.user?.role==='viewer'" @click="download(r.caseId,r.reportId,'html')">Descargar HTML</button>
                <button v-if="r.pdfAvailable" class="btn" :disabled="!!downloading||auth.user?.role==='viewer'" @click="download(r.caseId,r.reportId,'pdf')">Descargar PDF</button>
                <span v-if="!r.htmlAvailable&&!r.pdfAvailable">No disponible</span>
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
