<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import { diagnosticError } from "./diagnostics.format";
import type { Detail, Report } from "./diagnostics.types";
import DiagnosticBadge from "./DiagnosticBadge.vue";
import DiagnosticFields from "./DiagnosticFields.vue";
import DiagnosticSample from "./DiagnosticSample.vue";
import DiagnosticReviewPanel from "./DiagnosticReviewPanel.vue";
import "./diagnostics.css";
const route = useRoute(),
  data = ref<Detail>(),
  loading = ref(false),
  error = ref(""),
  report = ref<Report>(),
  reportError = ref(""),
  reportLoading = ref(false),
  reviewError = ref("");
let controller: AbortController | undefined,
  epoch = 0,
  reportEpoch = 0;
async function load() {
  controller?.abort();
  controller = new AbortController();
  const request = ++epoch;
  reportEpoch++;
  reportLoading.value = false;
  reviewError.value = "";
  loading.value = true;
  error.value = "";
  data.value = undefined;
  report.value = undefined;
  reportError.value = "";
  try {
    const result = await diagnosticsApi.detail(
      String(route.params.caseId),
      controller.signal,
    );
    if (request === epoch) data.value = result;
  } catch (e) {
    if (request === epoch && !controller.signal.aborted)
      error.value = diagnosticError(e);
  } finally {
    if (request === epoch) loading.value = false;
  }
}
watch(() => route.params.caseId, load, { immediate: true });
onBeforeUnmount(() => {
  epoch++;
  controller?.abort();
});
const hasSimulation = computed(() =>
  data.value?.flowPoints.some((f) => f.samples.some((s) => s.isSimulation)),
);
async function refreshReviews() {
  if (!data.value) return;
  const request = epoch;
  const caseId = data.value.case.caseId;
  reviewError.value = "";
  try {
    const rows = [];
    let cursor: string | undefined;
    do {
      const page = await diagnosticsApi.reviews(
        caseId,
        { limit: 100, cursor },
        controller?.signal,
      );
      if (request !== epoch || !data.value) return;
      rows.push(...page.items);
      cursor = page.page.nextCursor ?? undefined;
    } while (cursor);
    data.value.reviews = rows;
    data.value.currentReview = rows[0] ?? null;
  } catch (e) {
    if (request === epoch) reviewError.value = diagnosticError(e);
  }
}
async function showReport(version: number) {
  const request = ++reportEpoch;
  const caseEpoch = epoch;
  reportError.value = "";
  reportLoading.value = true;
  try {
    const result = await diagnosticsApi.report(
      String(route.params.caseId),
      version,
      controller?.signal,
    );
    if (request === reportEpoch && caseEpoch === epoch) report.value = result;
  } catch (e) {
    if (request === reportEpoch && caseEpoch === epoch)
      reportError.value = diagnosticError(e);
  } finally {
    if (request === reportEpoch && caseEpoch === epoch)
      reportLoading.value = false;
  }
}
</script>
<template>
  <main class="content diagnostics">
    <RouterLink to="/diagnosticos">← Diagnósticos</RouterLink>
    <p v-if="loading" role="status">Cargando expediente técnico…</p>
    <div v-else-if="error" role="alert" class="diag-alert">
      {{ error }} <button class="btn" @click="load">Reintentar</button>
    </div>
    <template v-else-if="data">
      <div class="diag-head">
        <div>
          <h1 class="page-title">Medidor {{ data.meter.meterId }}</h1>
          <p>
            {{ data.technician.displayName }} ·
            {{ data.technician.email || "Sin correo" }}
          </p>
        </div>
        <div class="diag-actions">
          <DiagnosticBadge :value="data.case.status" /><DiagnosticBadge
            :value="data.case.overallVerdict"
          /><DiagnosticBadge v-if="hasSimulation" value="SIMULATION" />
          <span
            >Revisión actual:
            <DiagnosticBadge :value="data.currentReview?.status ?? 'PENDING'"
          /></span>
        </div>
      </div>
      <p v-if="hasSimulation" class="diag-note">
        Este expediente contiene muestras de SIMULACIÓN. Se identifican
        individualmente; los resultados del caso son los registrados por la
        aplicación.
      </p>
      <section class="card">
        <h2>Resumen de la prueba</h2>
        <DiagnosticFields
          :value="data.case"
          :fields="[
            ['clientCreatedAt', 'Creación'],
            ['clientClosedAt', 'Cierre'],
            ['testBenchId', 'Banco de prueba'],
            ['sourceDeviceModel', 'Dispositivo'],
            ['sourceDeviceBrand', 'Marca'],
            ['sourceDeviceId', 'Identificador del dispositivo'],
            ['sourceAndroidVersion', 'Android'],
            ['sourceInstallationId', 'Instalación'],
            ['contractVersion', 'Contrato'],
            ['canonicalVersion', 'Versión canónica'],
            ['checksum', 'Checksum'],
            ['serverUpdatedAt', 'Última recepción'],
          ]"
        />
      </section>
      <section class="card">
        <h2>Medidor y técnico</h2>
        <DiagnosticFields :value="data.meter" /><DiagnosticFields
          :value="data.technician"
        />
      </section>
      <h2>Puntos de flujo Q1–Q4</h2>
      <p v-if="!data.flowPoints.length">No hay puntos de flujo registrados.</p>
      <section
        v-for="flow in data.flowPoints"
        :key="flow.flowPointId"
        class="card diag-flow diag-stack"
      >
        <div class="diag-head">
          <h2>{{ flow.code }}</h2>
          <DiagnosticBadge :value="flow.status" />
        </div>
        <DiagnosticFields
          :value="flow"
          :fields="[
            ['lpsApprox', 'Caudal aproximado (L/s)'],
            ['mpePct', 'MPE (%)'],
            ['statisticsN', 'Número estadístico de muestras'],
            ['meanErrorPct', 'Error medio (%)'],
            ['minimumErrorPct', 'Error mínimo (%)'],
            ['maximumErrorPct', 'Error máximo (%)'],
            ['dispersionPct', 'Dispersión (%)'],
            ['sampleStddevPct', 'Desviación estándar (%)'],
            ['repeatabilityStatus', 'Repetibilidad'],
          ]"
        />
        <details>
          <summary>Metadatos del punto de flujo</summary>
          <DiagnosticFields
            :value="
              Object.fromEntries(
                Object.entries(flow).filter(([key]) => key !== 'samples'),
              )
            "
          />
        </details>
        <p v-if="!flow.samples.length">Sin muestras registradas.</p>
        <details
          v-for="sample in flow.samples"
          :key="sample.sampleId"
          class="diag-stack"
          :open="flow.samples.length === 1"
        >
          <summary>
            Muestra {{ sample.sampleNumber }} ·
            <DiagnosticBadge :value="sample.measurementSource" />
            <DiagnosticBadge :value="sample.verdict" />
            <DiagnosticBadge
              v-if="sample.acquisitionIntegrityStatus === 'COMPROMISED'"
              value="COMPROMISED"
            />
          </summary>
          <DiagnosticSample :sample="sample" :case-id="data.case.caseId" />
        </details>
      </section>
      <section class="card diag-stack">
        <h2>Reportes</h2>
        <p v-if="!data.reports.length">Sin reportes registrados.</p>
        <article v-for="r in data.reports" :key="r.reportId">
          <h3>Versión {{ r.version }}</h3>
          <DiagnosticFields :value="r" />
          <p class="diag-note">
            Reporte registrado — archivo no expuesto por el API administrativo
            actual.
          </p>
          <button
            class="btn"
            :disabled="reportLoading"
            @click="showReport(r.version)"
          >
            Consultar reporte v{{ r.version }}
          </button>
        </article>
        <p v-if="reportLoading" role="status">Consultando reporte…</p>
        <p v-if="reportError" role="alert">{{ reportError }}</p>
        <DiagnosticFields v-if="report" :value="report" />
      </section>
      <section class="card">
        <h2>Historial del diagnóstico</h2>
        <p v-if="!data.statusHistory.length">Sin eventos de estado.</p>
        <ol class="diag-history">
          <li v-for="h in data.statusHistory" :key="h.historyId">
            <DiagnosticBadge :value="h.fromStatus" /> →
            <DiagnosticBadge :value="h.toStatus" /><DiagnosticFields
              :value="h"
            />
          </li>
        </ol>
      </section>
      <p v-if="reviewError" role="alert" class="diag-alert">
        {{ reviewError }}
        <button class="btn" @click="refreshReviews">
          Reintentar historial
        </button>
      </p>
      <DiagnosticReviewPanel
        :case-id="data.case.caseId"
        :reviews="data.reviews"
        @saved="refreshReviews"
      />
      <details class="card">
        <summary>Metadatos técnicos del expediente</summary>
        <DiagnosticFields :value="data.case" />
      </details>
    </template>
  </main>
</template>
