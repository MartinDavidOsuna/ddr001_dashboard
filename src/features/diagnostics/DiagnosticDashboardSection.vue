<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { EChartsCoreOption } from "echarts/core";
import EChart from "@/components/EChart.vue";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import { date, diagnosticError, label, number } from "./diagnostics.format";
import type {
  Summary,
  SummaryQuery,
  Metrics,
  Trends,
  TrendMetric,
  MetricsQuery,
} from "./diagnostics.types";
import DiagnosticFields from "./DiagnosticFields.vue";
const props = defineProps<{ filters: SummaryQuery; metrics?: boolean; compact?: boolean }>();
const summary = ref<Summary>(),
  metricsData = ref<Metrics>(),
  trend = ref<Trends>(),
  error = ref(""),
  loading = ref(false),
  metric = ref<TrendMetric>("cases"),
  groupBy = ref<MetricsQuery["groupBy"]>("day");
let controller: AbortController | undefined,
  epoch = 0;
async function load() {
  controller?.abort();
  controller = new AbortController();
  const current = ++epoch;
  error.value = "";
  loading.value = true;
  summary.value = undefined;
  metricsData.value = undefined;
  trend.value = undefined;
  try {
    if (props.metrics) {
      if (
        props.filters.from &&
        props.filters.to &&
        Date.parse(props.filters.to) - Date.parse(props.filters.from) >
          366 * 86400000
      )
        throw new Error("range");
      const [m, t] = await Promise.all([
        diagnosticsApi.metrics(
          { ...props.filters, groupBy: groupBy.value },
          controller.signal,
        ),
        diagnosticsApi.trends(
          { ...props.filters, groupBy: groupBy.value, metric: metric.value },
          controller.signal,
        ),
      ]);
      if (current === epoch) {
        metricsData.value = m;
        trend.value = t;
      }
    } else {
      const s = await diagnosticsApi.summary(props.filters, controller.signal);
      if (current === epoch) summary.value = s;
    }
  } catch (e) {
    if (current === epoch && !controller.signal.aborted)
      error.value =
        e instanceof Error && e.message === "range"
          ? "Selecciona un rango de hasta 366 días para métricas."
          : diagnosticError(e);
  } finally {
    if (current === epoch) loading.value = false;
  }
}
watch(() => [props.filters, props.metrics, metric.value, groupBy.value], load, {
  deep: true,
  immediate: true,
});
onBeforeUnmount(() => {
  epoch++;
  controller?.abort();
});
const kpis = computed(() =>
  summary.value
    ? [
        ["Diagnósticos totales", summary.value.cases.total],
        ["Aprobados", summary.value.cases.approved],
        ["Rechazados", summary.value.cases.rejected],
        ["No concluyentes", summary.value.cases.inconclusive],
        ["Medidores únicos", summary.value.uniqueMeters],
        ["Técnicos", summary.value.technicians],
        ["Muestras", summary.value.totalSamples],
        ["Muestras Bluetooth", summary.value.samplesBySource.BLE],
        ["Evidencias", summary.value.evidence.total],
        ["Evidencias verificadas", summary.value.evidence.verified],
        ["Evidencias pendientes", summary.value.evidence.pending],
        ["Evidencias comprometidas", summary.value.evidence.compromised],
      ]
    : [],
);
function bar(
  names: string[],
  values: Array<number | null>,
  name: string,
): EChartsCoreOption {
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 55, right: 18, top: 25, bottom: 65 },
    xAxis: { type: "category", data: names, axisLabel: { rotate: 20 } },
    yAxis: { type: "value" },
    series: [
      { name, type: "bar", data: values, itemStyle: { color: "#1768f5" } },
    ],
  };
}
const charts = computed(() => {
  const m = metricsData.value;
  if (!m) return [];
  return [
    {
      title: "Evolución",
      option: {
        ...bar(
          trend.value?.points.map((p) => p.period ?? "Sin fecha") ?? [],
          trend.value?.points.map((p) => p.value) ?? [],
          "Valor",
        ),
        series: [
          {
            type: "line",
            data: trend.value?.points.map((p) => p.value) ?? [],
            connectNulls: false,
          },
        ],
      },
    },
    {
      title: "Resultados de muestras",
      option: bar(
        m.verdicts.map((x) => label(x.verdict)),
        m.verdicts.map((x) => x.count),
        "Muestras",
      ),
    },
    {
      title: "Muestras por punto de flujo",
      option: bar(
        m.byFlowPoint.map((x) => x.code),
        m.byFlowPoint.map((x) => x.sampleCount),
        "Muestras",
      ),
    },
    {
      title: "Fuentes de medición",
      option: bar(
        m.bySource.map((x) => label(x.measurementSource)),
        m.bySource.map((x) => x.count),
        "Muestras",
      ),
    },
    {
      title: "Diagnósticos por técnico",
      option: bar(
        m.byTechnician.map((x) => x.technician),
        m.byTechnician.map((x) => x.caseCount),
        "Casos",
      ),
    },
    {
      title: "Casos por banco",
      option: bar(
        m.byTestBench.map((x) => x.testBenchId),
        m.byTestBench.map((x) => x.caseCount),
        "Casos",
      ),
    },
    {
      title: "Integridad de evidencias",
      option: bar(
        m.evidenceIntegrity.map((x) => label(x.integrityStatus)),
        m.evidenceIntegrity.map((x) => x.count),
        "Evidencias",
      ),
    },
    {
      title: "Muestras por diagnóstico",
      option: bar(
        m.samplesPerCase.map((x) => String(x.sampleCount)),
        m.samplesPerCase.map((x) => x.caseCount),
        "Casos",
      ),
    },
  ];
});
</script>
<template>
  <section class="diag-stack" aria-label="Resumen de diagnósticos">
    <div v-if="metrics" class="diag-filters">
      <label
        >Agrupar por<select v-model="groupBy">
          <option value="day">Día</option>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
        </select></label
      ><label
        >Evolución de<select v-model="metric">
          <option value="cases">Diagnósticos</option>
          <option value="approved">Aprobados</option>
          <option value="rejected">Rechazados</option>
          <option value="inconclusive">No concluyentes</option>
          <option value="samples">Muestras</option>
          <option value="meanErrorPct">Error medio (%)</option>
        </select></label
      >
    </div>
    <p v-if="loading" role="status">Cargando indicadores…</p>
    <div v-else-if="error" role="alert" class="diag-alert">
      {{ error }}
      <button class="btn" @click="load">Reintentar indicadores</button>
    </div>
    <template v-else-if="summary"
      ><div class="diag-kpis">
        <article v-for="[name, value] in kpis" :key="String(name)" class="card">
          <small>{{ name }}</small
          ><strong>{{ number(value) }}</strong>
        </article>
      </div>
      <section v-if="!compact" class="card">
        <h2>Muestras por fuente</h2>
        <div class="diag-actions">
          <span v-for="(count, source) in summary.samplesBySource" :key="source"
            >{{ label(source) }}: <b>{{ number(count) }}</b></span
          >
        </div>
      </section>
      <div v-if="!compact" class="diag-note">
        Última sincronización de casos seleccionados:
        {{ date(summary.sync.lastReceivedAt) }}<br />Estado global de
        sincronización (incluye simulaciones y otras fechas):
        {{ summary.sync.storedUnlinked }} evidencias sin vincular ·
        {{ summary.sync.partialReceipts }} recepciones parciales/en proceso.
      </div>
    </template>
    <template v-else-if="metricsData"
      ><p v-if="!metricsData.buckets.length" class="diag-note">
        Sin muestras para las métricas seleccionadas.
      </p>
      <div class="diag-charts">
        <article
          v-for="chart in charts"
          :key="chart.title"
          class="card diag-chart"
        >
          <h3>{{ chart.title }}</h3>
          <EChart
            :option="chart.option as EChartsCoreOption"
            :aria-label="chart.title"
          />
        </article>
      </div>
      <section v-if="!compact" class="card">
        <h2>Error y dispersión por Q</h2>
        <div class="diag-scroll">
          <table>
            <thead>
              <tr>
                <th>Q</th>
                <th>Muestras</th>
                <th>Error medio (%)</th>
                <th>Dispersión (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in metricsData.byFlowPoint" :key="row.code">
                <td>{{ row.code }}</td>
                <td>{{ row.sampleCount }}</td>
                <td>{{ number(row.meanErrorPct) }}</td>
                <td>{{ number(row.dispersionPct) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section v-if="!compact" class="card">
        <h2>Completitud de evidencias</h2>
        <DiagnosticFields
          :value="metricsData.evidenceCompleteness"
          :fields="[
            ['completeCaseCount', 'Casos completos'],
            ['incompleteCaseCount', 'Casos incompletos'],
          ]"
        />
      </section>
      <details v-if="!compact" class="card">
        <summary>Series, bancos y métricas completas</summary>
        <DiagnosticFields
          :value="metricsData as unknown as Record<string, unknown>"
        />
      </details>
    </template>
  </section>
</template>
