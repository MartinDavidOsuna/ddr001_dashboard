<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import InspectionDashboardSection from '@/features/inspections/InspectionDashboardSection.vue'
import ConstructionDashboardSection from '@/features/construction/ConstructionDashboardSection.vue'
import DiagnosticDashboardSection from '@/features/diagnostics/DiagnosticDashboardSection.vue'
import type { SummaryQuery } from '@/features/diagnostics/diagnostics.types'
import { Activity } from '@lucide/vue'
import '@/features/diagnostics/diagnostics.css'

const diagnosticFilters: SummaryQuery = { simulation: 'exclude' }
const route = useRoute()
const reviewsReady = ref(false)
const constructionReady = ref(false)
let focusedHash = ''
watch(() => [route.hash, reviewsReady.value, constructionReady.value], async () => {
  const hash = route.hash
  if (focusedHash === hash) return
  if (!['#estadisticas-revisiones', '#estadisticas-levantamientos'].includes(hash)) return
  if (!reviewsReady.value || (hash === '#estadisticas-levantamientos' && !constructionReady.value)) return
  await nextTick()
  if (route.hash !== hash) return
  const section = document.getElementById(hash.slice(1))
  if (section) focusedHash = hash
  section?.focus({ preventScroll: true })
  section?.scrollIntoView({ block: 'start', behavior: 'auto' })
}, { immediate: true, flush: 'post' })
</script>
<template>
  <div class="content">
    <div class="page-head"><div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Supervisión general — datos operativos reales</p></div><span class="muted desktop-only">Actualización al cargar</span></div>
    <section id="estadisticas-revisiones" class="statistics-section" tabindex="-1" aria-label="Estadísticas de revisiones">
      <InspectionDashboardSection @ready="reviewsReady = true" />
    </section>
    <section id="estadisticas-levantamientos" class="statistics-section" tabindex="-1" aria-label="Estadísticas de levantamientos">
      <ConstructionDashboardSection @ready="constructionReady = true" />
    </section>
    <section class="diagnostics dashboard-diagnostics" aria-labelledby="dashboard-diagnostics-title">
      <div class="diag-head">
        <div>
          <span class="diagnostics-eyebrow"><Activity :size="15" /> DIAGNÓSTICOS</span>
          <h2 id="dashboard-diagnostics-title">Diagnósticos de medidores</h2>
          <p class="diag-muted">Resultados, muestras y evidencias. Se excluyen las simulaciones.</p>
        </div>
        <RouterLink class="btn" to="/diagnosticos">Abrir diagnósticos</RouterLink>
      </div>
      <DiagnosticDashboardSection :filters="diagnosticFilters" compact />
      <DiagnosticDashboardSection :filters="diagnosticFilters" metrics compact />
    </section>
  </div>
</template>

<style scoped>
.statistics-section{scroll-margin-top:90px;min-width:0}
.dashboard-diagnostics{margin-top:28px;padding-top:24px;border-top:2px solid #dce5ef}
.diagnostics-eyebrow{display:flex;align-items:center;gap:6px;font-size:.68rem;letter-spacing:.07em;font-weight:750;color:#52647d}
.dashboard-diagnostics h2{margin:4px 0 2px;font-size:1.1rem}
.dashboard-diagnostics .diag-head p{margin:4px 0 0}
</style>
