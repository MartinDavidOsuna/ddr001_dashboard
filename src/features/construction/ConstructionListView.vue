<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import { RouterLink } from 'vue-router'
import { AlertTriangle, Camera, ChevronRight, HardHat, MapPin, RefreshCw } from '@lucide/vue'
import EChart from '@/components/EChart.vue'
import { CONSTRUCTION_DATA_MODE, constructionDataSource } from './construction.datasource'
import { averageCycleDays, constructionSummary, filterConstructionSurveys, productivityBy, rejectionRate, stageDistribution, statusDistribution, temporalActivity } from './construction.metrics'
import { constructionStatusLabels, constructionStepNames, type ConstructionFilters, type ConstructionSurvey, type SurveyStatus } from './construction.types'

const surveys = ref<ConstructionSurvey[]>([])
const loading = ref(true)
const filters = reactive<ConstructionFilters>({ status: 'all', stage: 'all', contractor: 'all', company: 'all', dateFrom: '', dateTo: '', search: '' })

onMounted(async () => {
  surveys.value = await constructionDataSource.list()
  loading.value = false
})

const summary = computed(() => constructionSummary(surveys.value))
const filtered = computed(() => filterConstructionSurveys(surveys.value, filters))
const contractors = computed(() => [...new Set(surveys.value.map((survey) => survey.contractorName))].sort())
const companies = computed(() => [...new Set(surveys.value.map((survey) => survey.companyName).filter((value): value is string => !!value))].sort())
const stages = computed(() => stageDistribution(surveys.value))
const activity = computed(() => temporalActivity(surveys.value))
const contractorProductivity = computed(() => productivityBy(surveys.value, 'contractorName'))
const companyProductivity = computed(() => productivityBy(surveys.value, 'companyName'))
const rejection = computed(() => rejectionRate(surveys.value))
const cycleDays = computed(() => averageCycleDays(surveys.value))

const statusOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '43%'], data: statusDistribution(surveys.value), label: { formatter: '{b}\n{c}' } }],
}))
const stageOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 36, right: 16, top: 24, bottom: 70 },
  xAxis: { type: 'category', data: stages.value.map((item) => item.name), axisLabel: { interval: 0, rotate: 25 } },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{ type: 'bar', data: stages.value.map((item) => item.value), barMaxWidth: 38 }],
}))
const activityOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['Creados', 'Terminados'] },
  grid: { left: 36, right: 16, top: 42, bottom: 34 },
  xAxis: { type: 'category', data: activity.value.map((item) => item.date.slice(5)) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    { name: 'Creados', type: 'line', smooth: true, data: activity.value.map((item) => item.created) },
    { name: 'Terminados', type: 'line', smooth: true, data: activity.value.map((item) => item.finished) },
  ],
}))
function productivityOption(items: { name: string; total: number; finished: number }[]): EChartsCoreOption {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Total', 'Terminados'] },
    grid: { left: 42, right: 16, top: 42, bottom: 68 },
    xAxis: { type: 'category', data: items.map((item) => item.name), axisLabel: { interval: 0, rotate: 20 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: 'Total', type: 'bar', data: items.map((item) => item.total), barMaxWidth: 28 },
      { name: 'Terminados', type: 'bar', data: items.map((item) => item.finished), barMaxWidth: 28 },
    ],
  }
}
const contractorOption = computed<EChartsCoreOption>(() => productivityOption(contractorProductivity.value))
const companyOption = computed<EChartsCoreOption>(() => productivityOption(companyProductivity.value))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
function stageLabel(survey: ConstructionSurvey) {
  return constructionStepNames[survey.currentStep] || 'Creación'
}
function statusClass(status: SurveyStatus) {
  if (status === 'rejected') return 'status status--rejected'
  if (status === 'accepted' || status === 'delivered') return 'status status--validated'
  if (status === 'executed') return 'status status--submitted'
  return 'status status--in_progress'
}
function syncLabel(survey: ConstructionSurvey) {
  return survey.syncState === 'synchronized' ? 'Sincronizado' : survey.syncState === 'pending' ? 'Pendiente' : 'Revisar'
}
</script>

<template>
  <section class="content construction-page">
    <div class="page-head">
      <div>
        <div class="eyebrow"><HardHat :size="15" /> LEVANTAMIENTOS / NUEVAS BASES</div>
        <h1 class="page-title">Levantamientos</h1>
        <p class="page-subtitle">Seguimiento de construcción de bases para nuevos hidrantes</p>
      </div>
      <span class="preview-badge">{{ CONSTRUCTION_DATA_MODE === 'API_REAL' ? 'Datos administrativos Construction' : 'Vista preliminar · integración de datos pendiente' }}</span>
    </div>

    <div class="kpis" aria-label="Indicadores de levantamientos">
      <article class="card kpi"><small>Total de levantamientos</small><strong>{{ summary.total }}</strong><span>Registros mock tipados</span></article>
      <article class="card kpi"><small>En proceso</small><strong>{{ summary.inProcess }}</strong><span>Creado + en proceso</span></article>
      <article class="card kpi"><small>Ejecutados</small><strong>{{ summary.executed }}</strong><span>Pendientes de revisión: {{ summary.pendingReview }}</span></article>
      <article class="card kpi kpi--danger"><small>Rechazados</small><strong>{{ summary.rejected }}</strong><span>Requieren corrección</span></article>
      <article class="card kpi"><small>Entregables</small><strong>{{ summary.accepted }}</strong><span>Aceptados</span></article>
      <article class="card kpi"><small>Entregados</small><strong>{{ summary.delivered }}</strong><span>Ciclo administrativo cerrado</span></article>
      <article class="card kpi kpi--progress"><small>Avance general</small><strong>{{ summary.completionPercent }}%</strong><span>Ejecutado + aceptado + entregado</span></article>
    </div>

    <div class="analytics-grid">
      <article class="card chart-card"><div class="section-head"><div><strong>Estado de levantamientos</strong><small>Distribución operativa</small></div></div><EChart :option="statusOption" aria-label="Estado mock de levantamientos" /></article>
      <article class="card chart-card"><div class="section-head"><div><strong>Bases por etapa actual</strong><small>Detección de cuellos de botella</small></div></div><EChart :option="stageOption" aria-label="Etapa mock de levantamientos" /></article>
      <article class="card chart-card chart-card--wide"><div class="section-head"><div><strong>Levantamientos creados / terminados</strong><small>Actividad temporal de la muestra</small></div></div><EChart :option="activityOption" aria-label="Actividad mock de levantamientos" /></article>
      <article class="card chart-card"><div class="section-head"><div><strong>Levantamientos por contratista</strong><small>Métrica operacional, no ranking laboral</small></div></div><EChart :option="contractorOption" aria-label="Productividad mock por contratista" /></article>
      <article class="card chart-card"><div class="section-head"><div><strong>Avance por Empresa</strong><small>La fuente futura podrá mapear el campo interno crew</small></div></div><EChart :option="companyOption" aria-label="Avance mock por Empresa" /></article>
    </div>

    <div class="secondary-metrics">
      <article class="card metric"><small>Tasa de rechazo</small><strong>{{ rejection }}%</strong><span>Rechazados o con corrección / revisados</span></article>
      <article class="card metric"><small>Tiempo promedio de construcción</small><strong>{{ cycleDays }} días</strong><span>createdAt → executedAt</span></article>
      <article class="card metric"><small>Fotografías registradas</small><strong>{{ summary.photos }}</strong><span>{{ summary.confirmedEvidence }} evidencias confirmadas</span></article>
    </div>

    <article class="card map-preview">
      <div class="section-head"><div><strong>Mapa de bases</strong><small>Previsualización de registros con ubicación canónica</small></div><MapPin :size="20" /></div>
      <div class="map-points">
        <RouterLink v-for="survey in surveys.filter((item) => item.canonicalLocation).slice(0, 5)" :key="survey.id" :to="`/levantamientos/${survey.id}`" class="map-point">
          <MapPin :size="17" /><span><strong>{{ survey.displayIdentifier }}</strong><small>{{ survey.canonicalLocation?.latitude.toFixed(5) }}, {{ survey.canonicalLocation?.longitude.toFixed(5) }}</small></span><ChevronRight :size="16" />
        </RouterLink>
      </div>
      <p class="map-note">La integración global con el mapa RV no se modifica en esta fase. El expediente reutiliza el componente de mapa existente.</p>
    </article>

    <article class="card list-card">
      <div class="section-head list-head"><div><strong>Listado de levantamientos</strong><small>{{ filtered.length }} de {{ surveys.length }} registros</small></div><span class="mode">{{ CONSTRUCTION_DATA_MODE }}</span></div>
      <div class="filters">
        <div class="field search-field"><label for="construction-search">Búsqueda</label><input id="construction-search" v-model="filters.search" placeholder="Identificador, cuenta, contratista o Empresa" /></div>
        <div class="field"><label for="construction-status">Estado</label><select id="construction-status" v-model="filters.status"><option value="all">Todos</option><option value="in_process">En proceso</option><option value="executed">Ejecutados</option><option value="rejected">Rechazados</option><option value="accepted">Entregables</option><option value="delivered">Entregados</option></select></div>
        <div class="field"><label for="construction-stage">Etapa</label><select id="construction-stage" v-model="filters.stage"><option value="all">Todas</option><option v-for="(name,index) in constructionStepNames.slice(1)" :key="name" :value="index + 1">{{ name }}</option></select></div>
        <div class="field"><label for="construction-contractor">Contratista</label><select id="construction-contractor" v-model="filters.contractor"><option value="all">Todos</option><option v-for="name in contractors" :key="name">{{ name }}</option></select></div>
        <div class="field"><label for="construction-company">Empresa</label><select id="construction-company" v-model="filters.company"><option value="all">Todas</option><option v-for="name in companies" :key="name">{{ name }}</option></select></div>
        <div class="field"><label for="construction-from">Desde</label><input id="construction-from" v-model="filters.dateFrom" type="date" /></div>
        <div class="field"><label for="construction-to">Hasta</label><input id="construction-to" v-model="filters.dateTo" type="date" /></div>
      </div>

      <div v-if="loading" class="empty-box"><RefreshCw class="spin" /> Cargando vista preliminar…</div>
      <div v-else-if="!filtered.length" class="empty-box">No hay levantamientos que coincidan con los filtros.</div>
      <div v-else>
        <div class="table-wrap desktop-table">
          <table>
            <thead><tr><th>Identificador</th><th>Número de cuenta</th><th>Estado</th><th>Etapa</th><th>Contratista</th><th>Empresa</th><th>Fecha creación</th><th>Última actualización</th><th>Fotos</th><th>Ubicación</th><th>Sincronización</th><th></th></tr></thead>
            <tbody>
              <tr v-for="survey in filtered" :key="survey.id">
                <td><strong>{{ survey.displayIdentifier }}</strong><small v-if="survey.accountConflict" class="conflict"><AlertTriangle :size="13" /> Conflicto de cuenta</small></td>
                <td>{{ survey.accountNumber || 'Sin número de cuenta' }}</td>
                <td><span :class="statusClass(survey.status)">{{ constructionStatusLabels[survey.status] }}</span></td>
                <td>{{ stageLabel(survey) }}</td>
                <td>{{ survey.contractorName }}</td><td>{{ survey.companyName || '—' }}</td>
                <td>{{ formatDate(survey.createdAt) }}</td><td>{{ formatDate(survey.updatedAt) }}</td>
                <td><Camera :size="15" /> {{ survey.photos.length }}</td><td>{{ survey.canonicalLocation ? 'Disponible' : 'Faltante' }}</td><td>{{ syncLabel(survey) }}</td>
                <td><RouterLink class="detail-link" :to="`/levantamientos/${survey.id}`" aria-label="Abrir expediente"><ChevronRight :size="18" /></RouterLink></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mobile-cards">
          <RouterLink v-for="survey in filtered" :key="survey.id" :to="`/levantamientos/${survey.id}`" class="survey-card">
            <div><strong>{{ survey.displayIdentifier }}</strong><span :class="statusClass(survey.status)">{{ constructionStatusLabels[survey.status] }}</span></div>
            <small>{{ survey.accountNumber || 'Sin número de cuenta' }} · {{ stageLabel(survey) }}</small>
            <dl><div><dt>Contratista</dt><dd>{{ survey.contractorName }}</dd></div><div><dt>Empresa</dt><dd>{{ survey.companyName || '—' }}</dd></div><div><dt>Fotos</dt><dd>{{ survey.photos.length }}</dd></div><div><dt>Sync</dt><dd>{{ syncLabel(survey) }}</dd></div></dl>
          </RouterLink>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.construction-page{display:grid;gap:18px}.eyebrow{display:flex;align-items:center;gap:6px;color:#52647d;font-size:.72rem;font-weight:750;letter-spacing:.06em;margin-bottom:5px}.preview-badge,.mode{font-size:.72rem;color:#365775;background:#eef5fb;border:1px solid #d0e0ee;border-radius:999px;padding:7px 10px}.kpis{display:grid;grid-template-columns:repeat(7,minmax(138px,1fr));gap:10px}.kpi{padding:15px;display:grid;gap:6px;min-height:112px}.kpi small,.metric small{font-weight:700;color:#52647d}.kpi strong{font-size:1.7rem;color:var(--navy)}.kpi span,.metric span,.section-head small{font-size:.72rem;color:var(--muted)}.kpi--danger{border-top:3px solid var(--red)}.kpi--progress{border-top:3px solid var(--blue)}.analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.chart-card{min-height:340px;padding:16px;display:grid;grid-template-rows:auto 1fr}.chart-card--wide{grid-column:1/-1}.section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.section-head>div{display:grid;gap:3px}.secondary-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metric{padding:17px;display:grid;gap:6px}.metric strong{font-size:1.35rem;color:var(--navy)}.map-preview{padding:17px}.map-points{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.map-point{display:flex;align-items:center;gap:8px;text-decoration:none;color:#20334c;border:1px solid var(--line);border-radius:8px;padding:11px;background:#f9fbfd}.map-point span{display:grid;gap:2px;min-width:0}.map-point strong{font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.map-point small{font-size:.68rem;color:var(--muted)}.map-point>svg:last-child{margin-left:auto}.map-note{margin:12px 0 0;color:var(--muted);font-size:.75rem}.list-card{padding:17px}.list-head{margin-bottom:14px}.filters{display:grid;grid-template-columns:2fr repeat(6,minmax(130px,1fr));gap:9px;margin-bottom:16px}.field input,.field select{height:38px;font-size:.8rem}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:8px}table{width:100%;border-collapse:collapse;min-width:1340px}th,td{padding:11px 10px;border-bottom:1px solid #e8edf3;text-align:left;font-size:.76rem;vertical-align:middle}th{background:#f6f8fb;color:#52647d;font-size:.68rem;text-transform:uppercase;letter-spacing:.03em}td:first-child{display:grid;gap:4px}.conflict{display:flex;align-items:center;gap:4px;color:var(--amber)}td svg{vertical-align:middle}.detail-link{display:grid;place-items:center;color:var(--blue)}.mobile-cards{display:none}.survey-card{display:grid;gap:9px;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:9px;padding:13px;background:#fff}.survey-card>div:first-child{display:flex;justify-content:space-between;gap:8px;align-items:center}.survey-card>small{color:var(--muted)}dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}dl div{display:grid;gap:2px}dt{font-size:.66rem;color:var(--muted)}dd{font-size:.78rem;margin:0}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1300px){.kpis{grid-template-columns:repeat(4,1fr)}.filters{grid-template-columns:repeat(4,1fr)}.search-field{grid-column:span 2}.map-points{grid-template-columns:repeat(3,1fr)}}
@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.analytics-grid,.secondary-metrics{grid-template-columns:1fr}.chart-card--wide{grid-column:auto}.filters{grid-template-columns:repeat(2,1fr)}.map-points{grid-template-columns:1fr 1fr}.desktop-table{display:none}.mobile-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
@media(max-width:600px){.page-head{display:grid}.preview-badge{justify-self:start}.kpis,.filters,.mobile-cards,.map-points{grid-template-columns:1fr}.search-field{grid-column:auto}.kpi{min-height:96px}.chart-card{min-height:320px;padding:12px}.list-card,.map-preview{padding:12px}}
</style>
