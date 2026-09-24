<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle, BarChart3, Camera, ChevronRight, HardHat, MapPin, RefreshCw } from '@lucide/vue'
import { problemMessage } from '@/api/client'
import { CONSTRUCTION_DATA_MODE, constructionDataSource } from './construction.datasource'
import { filterConstructionSurveys } from './construction.metrics'
import { constructionStatusLabels, constructionStepNames, type ConstructionFilters, type ConstructionSurvey, type SurveyStatus } from './construction.types'
import { getConstructionMetrics, type ConstructionApiMetrics } from './construction.analytics.service'

const surveys = ref<ConstructionSurvey[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1), pageSize = ref(25), total = ref(0), totalPages = ref(1)
const apiMode = CONSTRUCTION_DATA_MODE === 'API_REAL'
const apiMetrics = ref<ConstructionApiMetrics|null>(null)
const filters = reactive<ConstructionFilters>({ status: 'all', stage: 'all', contractor: 'all', company: 'all', dateFrom: '', dateTo: '', search: '' })

let requestId = 0
const metricsError = ref('')
async function load(requestedPage = page.value) {
  const id = ++requestId
  loading.value = true
  error.value = ''
  try {
    if (apiMode && constructionDataSource.listPage) {
      const result = await constructionDataSource.listPage({
        page: requestedPage, pageSize: pageSize.value, search: filters.search || undefined,
        status: filters.status === 'all' ? undefined : filters.status,
        stage: filters.stage === 'all' ? undefined : Number(filters.stage),
        contractorId: filters.contractor === 'all' ? undefined : filters.contractor,
        crewId: filters.company === 'all' ? undefined : filters.company,
        from: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).toISOString() : undefined,
        to: filters.dateTo ? endExclusive(filters.dateTo) : undefined,
      })
      if (id !== requestId) return
      surveys.value = result.items
      page.value = result.page
      total.value = result.total
      totalPages.value = result.totalPages
    } else {
      const items = await constructionDataSource.list()
      if (id !== requestId) return
      surveys.value = items
      total.value = items.length
    }
  } catch (cause) {
    if (id === requestId) error.value = problemMessage(cause, 'No fue posible cargar los levantamientos.')
  } finally {
    if (id === requestId) loading.value = false
  }
}
function endExclusive(date: string) {
  const end = new Date(`${date}T00:00:00`)
  end.setDate(end.getDate() + 1)
  return end.toISOString()
}
async function loadMetrics() {
  metricsError.value = ''
  try {
    apiMetrics.value = await getConstructionMetrics()
  } catch (cause) {
    metricsError.value = problemMessage(cause, 'No fue posible cargar las opciones de contratista y empresa.')
  }
}
onMounted(() => { if (apiMode) void loadMetrics(); void load(1) })
let filterTimer: ReturnType<typeof setTimeout> | undefined
watch(filters, () => {
  if (!apiMode) return
  ++requestId
  loading.value = true
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => void load(1), 250)
}, { deep: true })
onUnmounted(() => { clearTimeout(filterTimer); ++requestId })

const filtered = computed(() => apiMode?surveys.value:filterConstructionSurveys(surveys.value, filters))
const contractors = computed(() => apiMode?(apiMetrics.value?.contractors.map(x=>({id:x.contractorId,name:x.contractor}))??[]):[...new Set(surveys.value.map(s=>s.contractorName))].sort().map(name=>({id:name,name})))
const companies = computed(() => apiMode?(apiMetrics.value?.companies.filter(x=>x.crewId).map(x=>({id:String(x.crewId),name:x.crewName||'Sin asignar'}))??[]):[...new Set(surveys.value.map(s=>s.companyName).filter((v):v is string=>!!v))].sort().map(name=>({id:name,name})))
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
  if (survey.syncState === 'unknown') return 'No informada'
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
    </div>

    <article class="card list-card">
      <div class="section-head list-head"><div><strong>Listado de levantamientos</strong><small>{{ filtered.length }} de {{ apiMode ? total : surveys.length }} registros</small></div><nav class="list-actions" aria-label="Acciones de levantamientos"><RouterLink class="btn" to="/dashboard#estadisticas-levantamientos"><BarChart3 :size="17" />Estadísticas</RouterLink><RouterLink class="btn" to="/mapa?view=construction"><MapPin :size="17" />Mapa de bases</RouterLink></nav></div>
      <div v-if="metricsError" class="empty-box" role="alert">{{ metricsError }} <button class="btn" @click="loadMetrics">Reintentar opciones</button></div>
      <div class="filters">
        <div class="field search-field"><label for="construction-search">Búsqueda</label><input id="construction-search" v-model="filters.search" placeholder="Identificador, cuenta, contratista o Empresa" /></div>
        <div class="field"><label for="construction-status">Estado</label><select id="construction-status" v-model="filters.status"><option value="all">Todos</option><option value="in_process">En proceso (creados y en construcción)</option><option value="created">Creado</option><option value="in_progress">En construcción</option><option value="executed">Ejecutados</option><option value="rejected">Rechazados</option><option value="accepted">Entregables</option><option value="delivered">Entregados</option></select></div>
        <div class="field"><label for="construction-stage">Etapa</label><select id="construction-stage" v-model="filters.stage"><option value="all">Todas</option><option v-for="(name,index) in constructionStepNames.slice(1)" :key="name" :value="index + 1">{{ name }}</option></select></div>
        <div class="field"><label for="construction-contractor">Contratista</label><select id="construction-contractor" v-model="filters.contractor"><option value="all">Todos</option><option v-for="item in contractors" :key="item.id" :value="item.id">{{ item.name }}</option></select></div>
        <div class="field"><label for="construction-company">Empresa</label><select id="construction-company" v-model="filters.company"><option value="all">Todas</option><option v-for="item in companies" :key="item.id" :value="item.id">{{ item.name }}</option></select></div>
        <div class="field"><label for="construction-from">Desde</label><input id="construction-from" v-model="filters.dateFrom" type="date" /></div>
        <div class="field"><label for="construction-to">Hasta</label><input id="construction-to" v-model="filters.dateTo" type="date" /></div>
      </div>

      <div v-if="error" class="empty-box">{{ error }} <button class="btn" @click="load(page)">Reintentar</button></div>
      <div v-else-if="loading" class="empty-box"><RefreshCw class="spin" /> Cargando levantamientos…</div>
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
                <td><Camera :size="15" /> {{ survey.photoCount ?? survey.photos.length }}</td><td>{{ survey.canonicalLocation ? 'Disponible' : 'Faltante' }}</td><td>{{ syncLabel(survey) }}</td>
                <td><RouterLink class="detail-link" :to="`/levantamientos/${survey.id}`" aria-label="Abrir expediente"><ChevronRight :size="18" /></RouterLink></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mobile-cards">
          <RouterLink v-for="survey in filtered" :key="survey.id" :to="`/levantamientos/${survey.id}`" class="survey-card">
            <div><strong>{{ survey.displayIdentifier }}</strong><span :class="statusClass(survey.status)">{{ constructionStatusLabels[survey.status] }}</span></div>
            <small>{{ survey.accountNumber || 'Sin número de cuenta' }} · {{ stageLabel(survey) }}</small>
            <dl><div><dt>Contratista</dt><dd>{{ survey.contractorName }}</dd></div><div><dt>Empresa</dt><dd>{{ survey.companyName || '—' }}</dd></div><div><dt>Fotos</dt><dd>{{ survey.photoCount ?? survey.photos.length }}</dd></div><div><dt>Sync</dt><dd>{{ syncLabel(survey) }}</dd></div></dl>
          </RouterLink>
        </div>
        <div v-if="apiMode && totalPages > 1" class="pagination"><button class="btn" :disabled="page <= 1 || loading" @click="load(page-1)">Anterior</button><span>Página {{ page }} de {{ totalPages }}</span><button class="btn" :disabled="page >= totalPages || loading" @click="load(page+1)">Siguiente</button></div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.list-actions{display:flex;gap:8px;flex-wrap:wrap}.list-actions .btn{text-decoration:none}.list-head{flex-wrap:wrap}
.construction-page{display:grid;gap:18px}.eyebrow{display:flex;align-items:center;gap:6px;color:#52647d;font-size:.72rem;font-weight:750;letter-spacing:.06em;margin-bottom:5px}.preview-badge,.mode{font-size:.72rem;color:#365775;background:#eef5fb;border:1px solid #d0e0ee;border-radius:999px;padding:7px 10px}.kpis{display:grid;grid-template-columns:repeat(7,minmax(138px,1fr));gap:10px}.kpi{padding:15px;display:grid;gap:6px;min-height:112px}.kpi small,.metric small{font-weight:700;color:#52647d}.kpi strong{font-size:1.7rem;color:var(--navy)}.kpi span,.metric span,.section-head small{font-size:.72rem;color:var(--muted)}.kpi--danger{border-top:3px solid var(--red)}.kpi--progress{border-top:3px solid var(--blue)}.analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.chart-card{min-height:340px;padding:16px;display:grid;grid-template-rows:auto 1fr}.chart-card--wide{grid-column:1/-1}.section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.section-head>div{display:grid;gap:3px}.secondary-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metric{padding:17px;display:grid;gap:6px}.metric strong{font-size:1.35rem;color:var(--navy)}.map-preview{padding:17px}.map-points{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.map-point{display:flex;align-items:center;gap:8px;text-decoration:none;color:#20334c;border:1px solid var(--line);border-radius:8px;padding:11px;background:#f9fbfd}.map-point span{display:grid;gap:2px;min-width:0}.map-point strong{font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.map-point small{font-size:.68rem;color:var(--muted)}.map-point>svg:last-child{margin-left:auto}.map-note{margin:12px 0 0;color:var(--muted);font-size:.75rem}.list-card{padding:17px}.list-head{margin-bottom:14px}.filters{display:grid;grid-template-columns:2fr repeat(6,minmax(130px,1fr));gap:9px;margin-bottom:16px}.field input,.field select{height:38px;font-size:.8rem}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:8px}table{width:100%;border-collapse:collapse;min-width:1340px}th,td{padding:11px 10px;border-bottom:1px solid #e8edf3;text-align:left;font-size:.76rem;vertical-align:middle}th{background:#f6f8fb;color:#52647d;font-size:.68rem;text-transform:uppercase;letter-spacing:.03em}td:first-child{display:grid;gap:4px}.conflict{display:flex;align-items:center;gap:4px;color:var(--amber)}td svg{vertical-align:middle}.detail-link{display:grid;place-items:center;color:var(--blue)}.mobile-cards{display:none}.survey-card{display:grid;gap:9px;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:9px;padding:13px;background:#fff}.survey-card>div:first-child{display:flex;justify-content:space-between;gap:8px;align-items:center}.survey-card>small{color:var(--muted)}dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}dl div{display:grid;gap:2px}dt{font-size:.66rem;color:var(--muted)}dd{font-size:.78rem;margin:0}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.pagination{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:14px;font-size:.75rem}
@media(max-width:1300px){.kpis{grid-template-columns:repeat(4,1fr)}.filters{grid-template-columns:repeat(4,1fr)}.search-field{grid-column:span 2}.map-points{grid-template-columns:repeat(3,1fr)}}
@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.analytics-grid,.secondary-metrics{grid-template-columns:1fr}.chart-card--wide{grid-column:auto}.filters{grid-template-columns:repeat(2,1fr)}.map-points{grid-template-columns:1fr 1fr}.desktop-table{display:none}.mobile-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
@media(max-width:600px){.page-head{display:grid}.preview-badge{justify-self:start}.kpis,.filters,.mobile-cards,.map-points{grid-template-columns:1fr}.search-field{grid-column:auto}.kpi{min-height:96px}.chart-card{min-height:320px;padding:12px}.list-card,.map-preview{padding:12px}}
</style>
