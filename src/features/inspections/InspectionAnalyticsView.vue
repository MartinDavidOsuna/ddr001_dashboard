<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import InspectionAnalyticsFilters from './InspectionAnalyticsFilters.vue';
import InspectionAnalyticsCharts from './InspectionAnalyticsCharts.vue';
import InspectionAnalyticsQuality from './InspectionAnalyticsQuality.vue';
import InspectionRecentList from './InspectionRecentList.vue';
import { useRvAnalytics } from './rv-analytics.state';
import type { AnalyticsQuery } from './rv-analytics.types';
const { data, loading, error, load } = useRvAnalytics();
const applied = ref<AnalyticsQuery>({mode:'current',grain:'month'});
function apply(query: AnalyticsQuery) { applied.value = query; void load(query); }
onMounted(() => load(applied.value));
const cards = computed(() => data.value ? [
 {label:'Hidrantes evaluados', value:data.value.summary.evaluatedHydrants},
 {label:'Con hallazgos',value:data.value.summary.hydrantsWithFindings},
 {label:'Sin hallazgos detectados',value:data.value.summary.hydrantsWithoutFindings},
 {label:'Total de hallazgos',value:data.value.summary.findingCount},
 {label:'Hidrantes ausentes',value:data.value.summary.inactiveHydrants,link:'/revisiones/listado?status=inactive'},
 {label:'Cobertura RV',value:data.value.summary.coveragePercent,percent:true,context:`${data.value.summary.selectedHydrants} / ${data.value.summary.catalogHydrants} hidrantes del catálogo`},
] : []);
const updated = computed(() => data.value ? new Intl.DateTimeFormat('es-MX',{ dateStyle:'medium',timeStyle:'short',timeZone:'America/Hermosillo' }).format(new Date(data.value.scope.generatedAt)) : '');
const period = computed(() => {
  if (!data.value) return '';
  const format = (s: string) => new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeZone:'America/Hermosillo'}).format(new Date(s));
  return `${data.value.scope.from ? format(data.value.scope.from) : 'Sin inicio limitado'} — ${data.value.scope.to ? format(new Date(new Date(data.value.scope.to).getTime()-1).toISOString()) : 'Sin fin limitado'}`;
});
</script>
<template>
  <div class="content rv-analytics">
    <header class="page-head">
      <div>
        <h1 class="page-title">
          Revisiones Visuales
        </h1><p class="page-subtitle">
          Diagnóstico del estado observado de los hidrantes
        </p>
      </div><nav
        class="rv-actions"
        aria-label="Navegación RV"
      >
        <RouterLink
          class="btn"
          to="/revisiones/listado"
        >
          Listado completo
        </RouterLink><RouterLink
          class="btn"
          to="/mapa?view=reviews"
        >
          Mapa de revisiones
        </RouterLink>
      </nav>
    </header>
    <InspectionAnalyticsFilters @apply="apply" />
    <div
      role="status"
      aria-live="polite"
    >
      <p v-if="loading">
        {{ data?'Actualizando…':'Cargando análisis RV…' }}
      </p>
    </div>
    <div
      v-if="error"
      class="error-box"
      role="alert"
    >
      {{ error }} <button
        class="btn"
        @click="load(applied)"
      >
        Reintentar análisis
      </button><p v-if="data">
        Se conserva la consulta anterior, identificada por su modo y periodo debajo.
      </p>
    </div>
    <div
      v-if="!data && loading"
      class="rv-kpis"
      aria-label="Cargando indicadores"
    >
      <div
        v-for="n in 6"
        :key="n"
        class="card skeleton rv-skeleton"
      />
    </div>
    <template v-if="data">
      <p class="muted scope">
        {{ data.scope.mode==='current'?'Estado actual':'Histórico de revisiones' }} · {{ period }} · Actualizado {{ updated }} (Hermosillo)
      </p>
      <p
        v-if="data.scope.mode==='history'"
        class="rv-notice"
      >
        Los indicadores, distribuciones y tendencia cuentan inspecciones. Los KPIs de hidrantes y sistemas cuentan hidrantes distintos; un hidrante puede tener revisiones de diferentes estados.
      </p>
      <p
        v-if="!data.summary.selectedInspections"
        class="empty-box"
      >
        Sin revisiones evaluables para los filtros seleccionados.
      </p>
      <section
        class="rv-kpis"
        aria-label="Indicadores ejecutivos"
      >
        <article
          v-for="c in cards"
          :key="c.label"
          class="card rv-kpi"
        >
          <span>{{ c.label }}</span><strong>{{ c.value.toLocaleString('es-MX') }}{{ c.percent?'%':'' }}</strong><small v-if="c.context">{{ c.context }}</small><RouterLink
            v-if="c.link"
            :to="c.link"
          >
            Ver revisiones Ausentes
          </RouterLink>
        </article>
      </section>
      <p class="muted scope">
        Sin hallazgos detectados no certifica los campos sin dato. {{ data.summary.noEvaluableDataHydrants }} hidrantes sin evaluación física disponible.
      </p>
      <section>
        <h2>Hallazgos más frecuentes</h2><div
          v-if="data.pareto.length"
          class="rv-highlights"
        >
          <article
            v-for="f in data.pareto.slice(0,6)"
            :key="f.code"
            class="card rv-finding"
          >
            <h3>{{ f.label }}</h3><strong>{{ f.affected }}</strong><span>{{ f.affected }} / {{ f.evaluated }} {{ f.unit==='hydrants'?'hidrantes':'inspecciones' }} · {{ f.percentage }}%</span><small>No aplica {{ f.notApplicable }} · Sin dato {{ f.noData }}</small>
          </article>
        </div><p
          v-else
          class="empty-box"
        >
          Sin hallazgos registrados.
        </p>
      </section>
      <InspectionAnalyticsCharts :data="data" />
      <InspectionAnalyticsQuality
        :quality="data.dataQuality"
        :parcel="data.parcelValves"
        :findings="data.findings"
      />
    </template>
    <InspectionRecentList />
  </div>
</template>
<style scoped>
.rv-analytics{max-width:none;display:grid;gap:20px;min-width:0}.rv-actions{display:flex;flex-wrap:wrap;gap:8px}.rv-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.rv-kpi{padding:18px;display:flex;flex-direction:column;gap:12px;min-width:0;border-top:3px solid #3e829c}.rv-kpi span{font-size:.8rem;color:#52647d}.rv-kpi strong{font-size:1.8rem}.rv-kpi small,.rv-kpi a{font-size:.75rem}.rv-kpi a{margin-top:auto}.rv-skeleton{height:130px}.scope{margin:0;font-size:.8rem}.rv-notice{font-size:.85rem;background:#edf4fa;padding:14px;border-radius:8px}.rv-highlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.rv-finding{padding:16px;display:grid;gap:10px;border-left:3px solid #d18a2d}.rv-finding h3{font-size:.9rem;margin:0}.rv-finding strong{font-size:1.7rem;color:#97621b}.rv-finding span,.rv-finding small{font-size:.8rem}h2{font-size:1.1rem;margin-top:0}@media(max-width:1200px){.rv-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:768px){.rv-highlights{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.rv-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-kpi{padding:12px}.rv-kpi strong{font-size:1.5rem}.rv-highlights{grid-template-columns:1fr}}
</style>
