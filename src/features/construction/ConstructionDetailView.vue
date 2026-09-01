<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { AlertTriangle, ArrowLeft, Camera, Check, Circle, Clock3, FileWarning, HardHat, Image, Link2Off, MapPin, Navigation, UserRound } from '@lucide/vue'
import InspectionMap from '@/components/InspectionMap.vue'
import { CONSTRUCTION_DATA_MODE, constructionDataSource } from './construction.datasource'
import { constructionPhotoPurposeLabels, constructionStatusLabels, constructionStepNames, type ConstructionPhoto, type ConstructionSurvey, type SurveyStatus } from './construction.types'

const route = useRoute()
const survey = ref<ConstructionSurvey | null>(null)
const loading = ref(true)

onMounted(async () => {
  survey.value = await constructionDataSource.getById(String(route.params.surveyId || ''))
  loading.value = false
})

const finishedPhotos = computed(() => survey.value?.photos.filter((photo) => photo.stepNumber === 6) || [])
const hasCorrections = computed(() => (survey.value?.corrections.length || 0) > 0)

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
function statusClass(status: SurveyStatus) {
  if (status === 'rejected') return 'status status--rejected'
  if (status === 'accepted' || status === 'delivered') return 'status status--validated'
  if (status === 'executed') return 'status status--submitted'
  return 'status status--in_progress'
}
function photoPurpose(photo: ConstructionPhoto) {
  return photo.purpose ? constructionPhotoPurposeLabels[photo.purpose] : `Etapa ${photo.stepNumber || '—'}`
}
function photoStage(photo: ConstructionPhoto) {
  return constructionStepNames[photo.stepNumber || 0] || 'Evidencia'
}
function historyLabel(value: SurveyStatus | 'correction') {
  return value === 'correction' ? 'Corrección' : constructionStatusLabels[value]
}
function integrityLabel(photo: ConstructionPhoto) {
  return photo.integrityStatus === 'confirmed' ? 'Confirmada' : photo.integrityStatus === 'not_verified' ? 'No verificada' : photo.integrityStatus === 'retry_required' ? 'Reintento requerido' : 'Conflicto de mapeo'
}
</script>

<template>
  <section class="content detail-page">
    <div v-if="loading" class="empty-box">Cargando expediente preliminar…</div>
    <div v-else-if="!survey" class="empty-box"><FileWarning :size="28" /><strong>Levantamiento no encontrado</strong><RouterLink to="/levantamientos">Volver al listado</RouterLink></div>
    <template v-else>
      <div class="page-head">
        <div class="heading">
          <RouterLink to="/levantamientos" class="back-link"><ArrowLeft :size="17" /> Levantamientos</RouterLink>
          <div class="eyebrow"><HardHat :size="15" /> EXPEDIENTE DE LEVANTAMIENTO</div>
          <h1 class="page-title">{{ survey.displayIdentifier }}</h1>
          <p class="page-subtitle">Seguimiento constructivo, evidencia y trazabilidad administrativa</p>
        </div>
        <div class="head-actions"><span :class="statusClass(survey.status)">{{ constructionStatusLabels[survey.status] }}</span><span class="preview-badge">{{ CONSTRUCTION_DATA_MODE }}</span></div>
      </div>

      <div v-if="survey.alerts.length" class="alerts" aria-label="Alertas administrativas">
        <div v-for="alert in survey.alerts" :key="alert.id" class="alert" :class="`alert--${alert.severity}`"><AlertTriangle :size="17" /><span>{{ alert.label }}</span><small>Regla visual preliminar · backend pendiente</small></div>
      </div>

      <div class="identity-grid">
        <article class="card identity"><small>Identificador</small><strong>{{ survey.displayIdentifier }}</strong><span>{{ survey.id }}</span></article>
        <article class="card identity"><small>Número de cuenta</small><strong>{{ survey.accountNumber || 'Sin número de cuenta' }}</strong><span v-if="survey.accountConflict" class="warning"><AlertTriangle :size="13" /> Conflicto de cuenta detectado</span><span v-else>Sin conflicto conocido</span></article>
        <article class="card identity"><small>Contratista</small><strong>{{ survey.contractorName }}</strong><span>{{ survey.companyName || 'Empresa no informada' }}</span></article>
        <article class="card identity"><small>Creación</small><strong>{{ formatDate(survey.createdAt) }}</strong><span>Actualizado: {{ formatDate(survey.updatedAt) }}</span></article>
        <article class="card identity"><small>Etapa actual</small><strong>{{ constructionStepNames[survey.currentStep] || 'Creación' }}</strong><span>{{ survey.currentStep }}/6</span></article>
        <article class="card identity"><small>Vinculación de hidrante</small><strong>{{ survey.linkedHydrantId ? 'Vinculado' : 'Sin hidrante vinculado' }}</strong><span v-if="survey.conflictingHydrantId">Conflicto asociado: {{ survey.conflictingHydrantId }}</span><span v-else>No se fuerza relación con RV</span></article>
      </div>

      <article class="card section-card">
        <div class="section-head"><div><strong>Avance de construcción</strong><small>Hasta qué etapa llegó esta base</small></div><span class="progress-text">{{ survey.currentStep }}/6 etapas</span></div>
        <div class="construction-timeline">
          <div v-for="step in survey.steps" :key="step.number" class="stage" :class="{ 'stage--done': step.state === 'completed' }">
            <div class="stage-marker"><Check v-if="step.state === 'completed'" :size="16" /><Circle v-else :size="14" /></div>
            <div class="stage-body">
              <div class="stage-title"><strong>{{ step.number }}. {{ step.name }}</strong><span>{{ step.state === 'completed' ? 'Completada' : 'Pendiente' }}</span></div>
              <small><Clock3 :size="13" /> {{ formatDate(step.completedAt) }}</small>
              <p>{{ step.comment || 'Sin comentario capturado.' }}</p>
              <div class="stage-meta"><Camera :size="14" /> {{ step.photoIds.length }} fotografía{{ step.photoIds.length === 1 ? '' : 's' }} · evidencia {{ step.photoIds.length ? 'disponible' : 'pendiente' }}</div>
            </div>
          </div>
        </div>
      </article>

      <article class="card section-card evidence-section">
        <div class="section-head"><div><strong>Evidencia fotográfica por etapa</strong><small>Metadata realista compatible con el modelo móvil actual</small></div><span>{{ survey.photos.length }} fotografías</span></div>
        <div v-if="!survey.photos.length" class="empty-box"><Image :size="24" /> Aún no hay evidencia en este levantamiento.</div>
        <div v-else class="photo-grid">
          <article v-for="photo in survey.photos" :key="photo.id" class="photo-card">
            <div class="photo-thumb"><Camera :size="26" /><span>Thumbnail mock</span></div>
            <div class="photo-info"><div><strong>{{ photoStage(photo) }}</strong><span v-if="photo.stepNumber === 6" class="purpose">{{ photoPurpose(photo) }}</span></div><small>{{ formatDate(photo.capturedAt) }}</small>
              <dl><div><dt>Ubicación</dt><dd v-if="photo.location">{{ photo.location.latitude.toFixed(5) }}, {{ photo.location.longitude.toFixed(5) }}</dd><dd v-else>Faltante</dd></div><div><dt>Precisión GPS</dt><dd>{{ photo.location ? `${photo.location.accuracy.toFixed(1)} m` : '—' }}</dd></div><div><dt>Integridad</dt><dd>{{ integrityLabel(photo) }}</dd></div><div><dt>Sincronización</dt><dd>{{ photo.syncState === 'synchronized' ? 'Sincronizada' : 'Pendiente' }}</dd></div></dl>
            </div>
          </article>
        </div>
        <div v-if="finishedPhotos.length" class="cardinal-summary"><strong>Terminado</strong><span v-for="photo in finishedPhotos" :key="photo.id" class="purpose">{{ photoPurpose(photo) }}</span></div>
      </article>

      <article class="card section-card corrections-section">
        <div class="section-head"><div><strong>Correcciones</strong><small>Rechazo → corrección → nueva ejecución</small></div><span>{{ survey.corrections.length }} ronda{{ survey.corrections.length === 1 ? '' : 's' }}</span></div>
        <div v-if="!hasCorrections" class="empty-box">No hay rondas de corrección registradas.</div>
        <div v-else class="corrections">
          <article v-for="correction in survey.corrections" :key="correction.id" class="correction">
            <div class="round">Ronda {{ correction.round }}</div><div><strong>Motivo de rechazo</strong><p>{{ correction.rejectionReason }}</p></div><div><strong>Comentario de corrección</strong><p>{{ correction.contractorComment }}</p></div><div class="correction-meta"><span>Fotos: {{ correction.photoIds.length }}</span><span>Estado: {{ correction.state === 'resolved' ? 'Resuelta' : correction.state === 'submitted' ? 'Enviada' : 'Pendiente' }}</span><span>{{ formatDate(correction.createdAt) }}</span></div>
          </article>
        </div>
      </article>

      <div class="two-column">
        <article class="card section-card location-card">
          <div class="section-head"><div><strong>Ubicación</strong><small>Coordenada canónica de la base</small></div><Navigation :size="20" /></div>
          <template v-if="survey.canonicalLocation">
            <div class="location-meta"><div><small>Latitud</small><strong>{{ survey.canonicalLocation.latitude.toFixed(6) }}</strong></div><div><small>Longitud</small><strong>{{ survey.canonicalLocation.longitude.toFixed(6) }}</strong></div><div><small>Accuracy</small><strong>{{ survey.canonicalLocation.accuracy.toFixed(1) }} m</strong></div></div>
            <InspectionMap :captured="survey.canonicalLocation" />
            <p class="map-caption"><MapPin :size="14" /> Se reutiliza el mapa OpenStreetMap ya presente en DDR001; no se mezcla con el mapa global RV.</p>
          </template>
          <div v-else class="empty-box"><MapPin :size="24" /> Ubicación faltante.</div>
        </article>

        <article class="card section-card">
          <div class="section-head"><div><strong>Historial de estados</strong><small>Trazabilidad administrativa del levantamiento</small></div><UserRound :size="20" /></div>
          <div class="history">
            <div v-for="entry in survey.history" :key="entry.id" class="history-entry"><div class="history-dot"></div><div><strong>{{ historyLabel(entry.toStatus) }}</strong><small>{{ formatDate(entry.timestamp) }} · {{ entry.actor }} · {{ entry.actorType }}</small><p v-if="entry.reason">{{ entry.reason }}</p></div></div>
          </div>
        </article>
      </div>

      <article class="card contract-note">
        <Link2Off :size="20" /><div><strong>UI ONLY — sin escritura Construction</strong><p>Este expediente usa fixtures locales. Las acciones administrativas y la lectura productiva requieren contratos backend específicos que se definirán después de la revisión visual.</p></div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.detail-page{display:grid;gap:18px}.heading{display:grid;gap:4px}.back-link{display:inline-flex;align-items:center;gap:5px;color:var(--blue);text-decoration:none;font-size:.78rem;margin-bottom:4px}.eyebrow{display:flex;align-items:center;gap:6px;color:#52647d;font-size:.7rem;font-weight:750;letter-spacing:.06em}.head-actions{display:flex;align-items:center;gap:8px}.preview-badge{font-size:.68rem;color:#365775;background:#eef5fb;border:1px solid #d0e0ee;border-radius:999px;padding:6px 9px}.alerts{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.alert{display:grid;grid-template-columns:auto 1fr;column-gap:8px;row-gap:2px;padding:11px 13px;border-radius:8px;border:1px solid}.alert small{grid-column:2;color:inherit;opacity:.75;font-size:.67rem}.alert--info{background:#eef5ff;border-color:#c7daf8;color:#1554b8}.alert--warning{background:#fff8e5;border-color:#ead99c;color:#805800}.alert--danger{background:#fff0f0;border-color:#f3caca;color:#ad2b2b}.identity-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.identity{padding:14px;display:grid;gap:5px;min-height:100px}.identity small{font-size:.68rem;color:var(--muted);font-weight:700}.identity strong{font-size:.88rem;color:var(--navy)}.identity span{font-size:.7rem;color:var(--muted);word-break:break-word}.identity .warning{display:flex;align-items:center;gap:4px;color:var(--amber)}.section-card{padding:17px}.section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}.section-head>div{display:grid;gap:3px}.section-head small{font-size:.72rem;color:var(--muted)}.section-head>span,.progress-text{font-size:.72rem;color:#52647d}.construction-timeline{display:grid;grid-template-columns:repeat(6,1fr);position:relative}.construction-timeline::before{content:'';position:absolute;top:17px;left:8%;right:8%;height:2px;background:#dce4ee}.stage{position:relative;display:grid;justify-items:center;grid-template-rows:auto 1fr;gap:10px;padding:0 6px}.stage-marker{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid #cbd5e1;color:#718198;z-index:1}.stage--done .stage-marker{background:#ebfaf2;border-color:#5dc889;color:#087a3b}.stage-body{text-align:center;display:grid;gap:5px;align-content:start}.stage-title{display:grid;gap:3px}.stage-title strong{font-size:.76rem}.stage-title span,.stage-body small,.stage-meta{font-size:.67rem;color:var(--muted)}.stage-body small,.stage-meta{display:flex;justify-content:center;align-items:center;gap:4px}.stage-body p{font-size:.7rem;color:#52647d;margin:3px 0}.photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.photo-card{border:1px solid var(--line);border-radius:9px;overflow:hidden;background:#fff}.photo-thumb{height:112px;background:linear-gradient(135deg,#edf3f8,#dfe8f1);display:grid;place-items:center;align-content:center;gap:7px;color:#7890a8}.photo-thumb span{font-size:.68rem}.photo-info{padding:11px;display:grid;gap:5px}.photo-info>div:first-child{display:flex;justify-content:space-between;gap:8px}.photo-info strong{font-size:.76rem}.photo-info>small{font-size:.67rem;color:var(--muted)}.purpose{font-size:.62rem;font-weight:750;color:#1554b8;background:#eef5ff;border:1px solid #c7daf8;border-radius:5px;padding:3px 5px}.photo-info dl{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:4px 0 0}.photo-info dl div{display:grid;gap:2px}.photo-info dt{font-size:.6rem;color:var(--muted)}.photo-info dd{margin:0;font-size:.67rem}.cardinal-summary{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:.75rem}.corrections{display:grid;gap:10px}.correction{display:grid;grid-template-columns:90px 1fr 1fr 1.2fr;gap:13px;align-items:start;border:1px solid var(--line);border-radius:8px;padding:12px}.round{font-weight:750;color:var(--red)}.correction strong{font-size:.7rem;color:#52647d}.correction p{margin:3px 0;font-size:.77rem}.correction-meta{display:flex;gap:8px;flex-wrap:wrap}.correction-meta span{font-size:.67rem;background:#f4f7fa;border-radius:5px;padding:5px 6px}.two-column{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}.location-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.location-meta div{display:grid;gap:2px;background:#f7f9fb;border:1px solid var(--line);border-radius:7px;padding:9px}.location-meta small{font-size:.64rem;color:var(--muted)}.location-meta strong{font-size:.78rem}.map-caption{display:flex;align-items:center;gap:5px;font-size:.68rem;color:var(--muted);margin:8px 0 0}.history{display:grid}.history-entry{display:grid;grid-template-columns:18px 1fr;gap:9px;position:relative;padding-bottom:17px}.history-entry:not(:last-child)::before{content:'';position:absolute;left:6px;top:11px;bottom:-3px;width:2px;background:#dce4ee}.history-dot{width:14px;height:14px;border-radius:50%;background:#1765e8;border:3px solid #dbe8ff;z-index:1}.history-entry>div:last-child{display:grid;gap:3px}.history-entry strong{font-size:.78rem}.history-entry small{font-size:.66rem;color:var(--muted)}.history-entry p{font-size:.72rem;margin:2px 0;color:#52647d}.contract-note{padding:15px;display:flex;gap:10px;align-items:flex-start;border-style:dashed}.contract-note p{font-size:.75rem;color:var(--muted);margin:3px 0 0}
@media(max-width:1300px){.identity-grid{grid-template-columns:repeat(3,1fr)}.photo-grid{grid-template-columns:repeat(3,1fr)}.construction-timeline{grid-template-columns:repeat(3,1fr);gap:18px}.construction-timeline::before{display:none}.alerts{grid-template-columns:1fr 1fr}.correction{grid-template-columns:90px 1fr 1fr}.correction-meta{grid-column:2/-1}}
@media(max-width:900px){.page-head{align-items:flex-start}.head-actions{flex-wrap:wrap;justify-content:flex-end}.photo-grid{grid-template-columns:1fr 1fr}.two-column{grid-template-columns:1fr}.construction-timeline{grid-template-columns:1fr}.stage{grid-template-columns:38px 1fr;grid-template-rows:auto;justify-items:start;text-align:left}.stage-body{text-align:left}.stage-body small,.stage-meta{justify-content:flex-start}.alerts{grid-template-columns:1fr}.correction{grid-template-columns:1fr}.correction-meta{grid-column:auto}.round{border-bottom:1px solid var(--line);padding-bottom:6px}}
@media(max-width:600px){.page-head{display:grid}.head-actions{justify-content:flex-start}.identity-grid,.photo-grid,.location-meta{grid-template-columns:1fr}.section-card{padding:12px}.photo-info dl{grid-template-columns:1fr}.identity{min-height:0}}
</style>
