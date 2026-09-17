<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { Activity } from "@lucide/vue";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import { useCursor } from "./diagnostics.cursor";
import { date, duration, label, utcDateRange } from "./diagnostics.format";
import type { CaseQuery, SummaryQuery } from "./diagnostics.types";
import DiagnosticBadge from "./DiagnosticBadge.vue";
import DiagnosticDashboardSection from "./DiagnosticDashboardSection.vue";
import DiagnosticUserAccess from "./DiagnosticUserAccess.vue";
import DiagnosticReports from "./DiagnosticReports.vue";
import "./diagnostics.css";
const tab = ref("Resumen"),
  visited = ref(new Set(["Resumen"])),
  form = reactive<CaseQuery>({
    simulation: "exclude",
    limit: 25,
    sort: "createdAtDesc",
  }),
  applied = ref<CaseQuery>({ ...form }),
  from = ref(""),
  to = ref(""),
  validation = ref("");
const list = useCursor((cursor, signal) =>
  diagnosticsApi.cases({ ...applied.value, cursor }, signal),
);
const summaryFilters = computed<SummaryQuery>(() => ({
  simulation: applied.value.simulation,
  from: applied.value.from,
  to: applied.value.to,
  userId: applied.value.userId,
  testBenchId: applied.value.testBenchId,
}));
const selects = [
  {
    key: "verdict",
    label: "Veredicto",
    options: ["APROBADO", "RECHAZADO", "NO_CONCLUYENTE"],
  },
  { key: "status", label: "Estado", options: ["OPEN", "CLOSED"] },
  { key: "q", label: "Punto de flujo", options: ["Q1", "Q2", "Q3", "Q4"] },
  {
    key: "measurementSource",
    label: "Fuente de medición",
    options: ["VISUAL", "MANUAL", "LED", "BLE", "SIMULATION"],
  },
  {
    key: "reviewStatus",
    label: "Estado de revisión",
    options: ["PENDING", "REVIEWED", "FLAGGED", "RESOLVED"],
  },
  {
    key: "integrityStatus",
    label: "Integridad (muestra o evidencia)",
    options: ["OK", "COMPROMISED", "VERIFIED", "MISMATCH", "CORRUPT"],
  },
  {
    key: "syncStatus",
    label: "Sincronización",
    options: ["received", "pending"],
  },
] as const;
function selectTab(value: string) {
  tab.value = value;
  visited.value.add(value);
  void nextTick(() => window.dispatchEvent(new Event("resize")));
}
function apply() {
  validation.value = "";
  if (from.value && to.value && from.value > to.value) {
    validation.value =
      "La fecha final debe ser igual o posterior a la inicial.";
    return;
  }
  if (form.query && form.query.trim().length < 2) {
    validation.value = "La búsqueda requiere al menos 2 caracteres.";
    return;
  }
  applied.value = {
    ...Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== "" && v !== undefined),
    ),
    ...utcDateRange(from.value, to.value),
  };
  void list.reset();
}
function reset() {
  for (const key of Object.keys(form)) delete form[key as keyof CaseQuery];
  Object.assign(form, {
    simulation: "exclude",
    limit: 25,
    sort: "createdAtDesc",
  });
  from.value = "";
  to.value = "";
  apply();
}
onMounted(list.load);
</script>
<template>
  <main class="content diagnostics">
    <div class="diag-head">
      <div>
        <h1 class="page-title"><Activity :size="23" /> Diagnósticos</h1>
        <p class="page-subtitle">
          Expedientes técnicos y metrológicos · Verificador funcional
        </p>
      </div>
      <span class="diag-badge neutral">Datos del API funcional</span>
    </div>
    <form class="card diag-stack" @submit.prevent="apply">
      <div class="diag-filters">
        <label
          >Datos<select
            v-model="form.simulation"
            aria-label="Datos"
            @change="apply"
          >
            <option value="exclude">Reales</option>
            <option value="include">Reales + simulaciones</option>
            <option value="only">Sólo simulaciones</option>
          </select></label
        >
        <label
          >Buscar diagnóstico<input
            v-model="form.query"
            minlength="2"
            maxlength="120"
            placeholder="Medidor, banco, técnico o correo"
        /></label>
        <label>Desde<input v-model="from" type="date" /></label
        ><label>Hasta<input v-model="to" type="date" /></label>
        <label
          >Técnico (UUID)<input
            v-model="form.userId"
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            placeholder="Identificador del técnico"
        /></label>
        <label
          >Banco de prueba<input v-model="form.testBenchId" maxlength="180"
        /></label>
      </div>
      <details>
        <summary>Filtros del listado</summary>
        <div class="diag-filters">
          <label v-for="field in selects" :key="field.key"
            >{{ field.label
            }}<select v-model="form[field.key]">
              <option value="">Todos</option>
              <option
                v-for="option in field.options"
                :key="option"
                :value="option"
              >
                {{
                  option === "received"
                    ? "Recibido"
                    : option === "pending"
                      ? "Pendiente"
                      : label(option)
                }}
              </option>
            </select></label
          >
          <label
            >Modelo del dispositivo<input
              v-model="form.deviceModel"
              maxlength="120"
          /></label>
          <label
            >Orden<select v-model="form.sort">
              <option value="createdAtDesc">Más recientes</option>
              <option value="createdAtAsc">Más antiguos</option>
              <option value="closedAtDesc">Cierre más reciente</option>
              <option value="meterIdAsc">Medidor</option>
              <option value="verdictAsc">Veredicto</option>
            </select></label
          >
          <label
            >Registros por consulta<select v-model="form.limit">
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select></label
          >
        </div>
        <p class="diag-muted">
          OK/Comprometida resumen la integridad del caso; Verificada/Hash no
          coincide/Corrupta buscan estados de evidencia. Los filtros avanzados
          afectan sólo el listado.
        </p>
      </details>
      <p v-if="validation" role="alert" class="diag-alert">{{ validation }}</p>
      <div class="diag-actions">
        <button class="btn btn-primary">Aplicar filtros</button
        ><button type="button" class="btn" @click="reset">Restablecer</button>
      </div>
    </form>
    <p v-if="applied.simulation !== 'exclude'" class="diag-note">
      {{
        applied.simulation === "only"
          ? "Sólo SIMULACIONES: estos resultados no representan pruebas físicas."
          : "Incluye SIMULACIONES: los indicadores combinan pruebas físicas y simuladas."
      }}
    </p>
    <nav class="diag-tabs" aria-label="Secciones de diagnósticos">
      <button
        v-for="name in [
          'Resumen',
          'Diagnósticos',
          'Métricas',
          'Técnicos',
          'Reportes',
        ]"
        :key="name"
        class="btn"
        :aria-pressed="tab === name"
        @click="selectTab(name)"
      >
        {{ name }}
      </button>
    </nav>
    <DiagnosticDashboardSection
      v-show="tab === 'Resumen'"
      :filters="summaryFilters"
    />
    <DiagnosticDashboardSection
      v-if="visited.has('Métricas')"
      v-show="tab === 'Métricas'"
      :filters="summaryFilters"
      metrics
    />
    <DiagnosticUserAccess
      v-if="visited.has('Técnicos')"
      v-show="tab === 'Técnicos'"
    />
    <DiagnosticReports
      v-if="visited.has('Reportes')"
      v-show="tab === 'Reportes'"
      :filters="summaryFilters"
    />
    <section
      v-show="tab === 'Resumen' || tab === 'Diagnósticos'"
      class="card diag-stack"
    >
      <h2>Diagnósticos registrados</h2>
      <p v-if="list.loading.value" role="status">Cargando diagnósticos…</p>
      <div v-else-if="list.error.value" role="alert" class="diag-alert">
        {{ list.error.value }}
        <button class="btn" @click="list.load">Reintentar listado</button>
      </div>
      <template v-else-if="list.data.value"
        ><p v-if="!list.data.value.items.length">
          No hay diagnósticos que coincidan con los filtros.
        </p>
        <div
          v-else
          class="diag-scroll"
          tabindex="0"
          aria-label="Tabla de diagnósticos; desplazamiento horizontal"
        >
          <table class="diag-case-table">
            <thead>
              <tr>
                <th>Medidor</th>
                <th>Técnico / correo</th>
                <th>Creación / cierre</th>
                <th>Estado / veredicto</th>
                <th>Banco / dispositivo</th>
                <th>Fuentes</th>
                <th>Q / muestras / evidencias</th>
                <th>Integridad</th>
                <th>Revisión</th>
                <th>Duración</th>
                <th>Recepción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in list.data.value.items" :key="row.caseId">
                <td>
                  <RouterLink :to="`/diagnosticos/${row.caseId}`">{{
                    row.meterId
                  }}</RouterLink
                  ><DiagnosticBadge
                    v-if="row.measurementSources.includes('SIMULATION')"
                    value="SIMULATION"
                  />
                </td>
                <td>{{ row.technicianName }}<br />{{ row.technicianEmail }}</td>
                <td>{{ date(row.createdAt) }}<br />{{ date(row.closedAt) }}</td>
                <td>
                  <DiagnosticBadge :value="row.status" /><DiagnosticBadge
                    :value="row.overallVerdict"
                  />
                </td>
                <td>
                  {{ row.testBenchId }}<br />{{
                    row.deviceModel || "No disponible"
                  }}
                </td>
                <td>
                  <DiagnosticBadge
                    v-for="source in row.measurementSources"
                    :key="source"
                    :value="source"
                  />
                </td>
                <td>
                  {{ row.flowPointCount }} Q · {{ row.sampleCount }} muestras ·
                  {{ row.evidenceCount }} evidencias
                </td>
                <td><DiagnosticBadge :value="row.integrityStatus" /></td>
                <td>
                  <DiagnosticBadge :value="row.reviewStatus" /><br />{{
                    row.reviewClassification
                  }}
                </td>
                <td>{{ duration(row.durationSeconds) }}</td>
                <td>{{ date(row.syncReceivedAt) }}</td>
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
          ><span>Consulta {{ list.history.value.length }}</span
          ><button
            class="btn"
            :disabled="!list.data.value.page.nextCursor"
            @click="list.next"
          >
            Siguiente
          </button>
        </div>
      </template>
    </section>
  </main>
</template>
