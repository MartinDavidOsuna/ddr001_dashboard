<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import { Camera, CheckCircle2, Clock3, HardHat, PackageCheck, TriangleAlert } from '@lucide/vue'
import EChart from '@/components/EChart.vue'
import { constructionSurveys } from './construction.mock'
import { constructionSummary, stageDistribution, statusDistribution, temporalActivity } from './construction.metrics'

const summary = computed(() => constructionSummary(constructionSurveys))
const stages = computed(() => stageDistribution(constructionSurveys))
const activity = computed(() => temporalActivity(constructionSurveys))
const statusOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '43%'], data: statusDistribution(constructionSurveys), label: { formatter: '{b}: {c}' } }],
}))
const stageOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'axis' }, grid: { left: 34, right: 12, top: 22, bottom: 62 },
  xAxis: { type: 'category', data: stages.value.map((item) => item.name), axisLabel: { interval: 0, rotate: 24 } },
  yAxis: { type: 'value', minInterval: 1 }, series: [{ type: 'bar', data: stages.value.map((item) => item.value), barMaxWidth: 36 }],
}))
const activityOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'axis' }, legend: { data: ['Creados', 'Terminados'] }, grid: { left: 34, right: 12, top: 42, bottom: 32 },
  xAxis: { type: 'category', data: activity.value.map((item) => item.date.slice(5)) }, yAxis: { type: 'value', minInterval: 1 },
  series: [{ name: 'Creados', type: 'line', smooth: true, data: activity.value.map((item) => item.created) }, { name: 'Terminados', type: 'line', smooth: true, data: activity.value.map((item) => item.finished) }],
}))
</script>

<template>
  <section class="construction-dashboard" aria-labelledby="construction-dashboard-title">
    <div class="construction-heading">
      <div><span class="eyebrow"><HardHat :size="15" /> LEVANTAMIENTOS / NUEVAS BASES</span><h2 id="construction-dashboard-title">Construcción de nuevos hidrantes</h2><p>Métricas Construction separadas de Revisión Visual.</p></div>
      <RouterLink to="/levantamientos" class="btn">Abrir módulo</RouterLink>
    </div>
    <div class="preview-note">Vista preliminar con fixtures locales · integración de datos pendiente</div>
    <div class="construction-kpis">
      <article class="card"><HardHat :size="19" /><div><small>Total de bases</small><strong>{{ summary.total }}</strong></div></article>
      <article class="card"><Clock3 :size="19" /><div><small>En construcción</small><strong>{{ summary.inProcess }}</strong></div></article>
      <article class="card"><CheckCircle2 :size="19" /><div><small>Ejecutadas</small><strong>{{ summary.finished }}</strong></div></article>
      <article class="card"><Camera :size="19" /><div><small>Pendientes de revisión</small><strong>{{ summary.pendingReview }}</strong></div></article>
      <article class="card"><TriangleAlert :size="19" /><div><small>Rechazadas</small><strong>{{ summary.rejected }}</strong></div></article>
      <article class="card"><PackageCheck :size="19" /><div><small>Entregadas</small><strong>{{ summary.delivered }}</strong></div></article>
    </div>
    <div class="construction-charts">
      <article class="card chart"><div><strong>Estado de levantamientos</strong><small>Distribución operativa</small></div><EChart :option="statusOption" aria-label="Estado mock de levantamientos" /></article>
      <article class="card chart"><div><strong>Bases por etapa actual</strong><small>Cuellos de botella</small></div><EChart :option="stageOption" aria-label="Etapa actual mock de levantamientos" /></article>
      <article class="card chart chart--wide"><div><strong>Levantamientos creados / terminados</strong><small>Actividad temporal</small></div><EChart :option="activityOption" aria-label="Actividad temporal mock de levantamientos" /></article>
    </div>
  </section>
</template>

<style scoped>
.construction-dashboard{display:grid;gap:12px;margin-top:28px;padding-top:24px;border-top:2px solid #dce5ef}.construction-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}.construction-heading h2{margin:4px 0 2px;font-size:1.1rem;color:var(--navy)}.construction-heading p{margin:0;color:var(--muted);font-size:.78rem}.eyebrow{display:flex;align-items:center;gap:6px;font-size:.68rem;letter-spacing:.07em;font-weight:750;color:#52647d}.preview-note{justify-self:start;font-size:.68rem;color:#365775;background:#eef5fb;border:1px solid #d0e0ee;border-radius:999px;padding:6px 9px}.construction-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}.construction-kpis article{padding:12px;display:flex;align-items:center;gap:10px;color:#48617c}.construction-kpis article div{display:grid;gap:2px}.construction-kpis small{font-size:.65rem;color:var(--muted)}.construction-kpis strong{font-size:1.2rem;color:var(--navy)}.construction-charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.chart{height:330px;padding:14px;display:grid;grid-template-rows:auto 1fr}.chart>div{display:grid;gap:2px}.chart small{font-size:.68rem;color:var(--muted)}.chart--wide{grid-column:1/-1}
@media(max-width:1200px){.construction-kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:800px){.construction-kpis{grid-template-columns:repeat(2,1fr)}.construction-charts{grid-template-columns:1fr}.chart--wide{grid-column:auto}.construction-heading{align-items:flex-start}}
@media(max-width:520px){.construction-heading{display:grid}.construction-kpis{grid-template-columns:1fr 1fr}.chart{padding:10px}.construction-dashboard{margin-top:20px}}
</style>
