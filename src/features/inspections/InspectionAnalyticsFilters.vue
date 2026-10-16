<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { dashboardService } from '@/services/dashboard';
import { problemMessage } from '@/api/client';
import type { FilterOption } from '@/api/types';
import type { AnalyticsQuery } from './rv-analytics.types';
import { localDateRange } from './rv-analytics.state';
const emit = defineEmits<{ apply: [query: AnalyticsQuery] }>();
const fields = reactive({ mode: 'current' as AnalyticsQuery['mode'], grain: 'month' as AnalyticsQuery['grain'], from: '', to: '', userId: '', crewId: '', status: '' as NonNullable<AnalyticsQuery['status']> | '' });
const technicians = ref<FilterOption[]>([]), crews = ref<FilterOption[]>([]), error = ref('');
async function directories() { try { const f = await dashboardService.filters(); technicians.value = f.technicians; crews.value = f.crews; error.value = ''; } catch (e) { error.value = problemMessage(e, 'No se pudieron cargar técnicos y cuadrillas.'); } }
onMounted(directories);
function apply() {
  emit('apply', { mode: fields.mode, grain: fields.grain, ...localDateRange(fields.from, fields.to), ...(fields.userId ? {userId: fields.userId} : {}), ...(fields.crewId ? {crewId: fields.crewId} : {}), ...(fields.status ? {status: fields.status} : {}) });
}
</script>
<template>
  <form
    class="card rv-filters"
    aria-label="Filtros del análisis RV"
    @submit.prevent="apply"
  >
    <label>Modo<select v-model="fields.mode" aria-label="Modo"><option value="current">Estado actual</option><option value="history">Histórico de revisiones</option></select></label>
    <label>Desde<input
      v-model="fields.from" aria-label="Desde"
      type="date"
      :max="fields.to || undefined"
    ></label>
    <label>Hasta<input
      v-model="fields.to" aria-label="Hasta"
      type="date"
      :min="fields.from || undefined"
    ></label>
    <label>Técnico<select v-model="fields.userId" aria-label="Técnico"><option value="">Todos</option><option
      v-for="t in technicians"
      :key="t.id"
      :value="t.id"
    >{{ t.label }}</option></select></label>
    <label>Cuadrilla<select v-model="fields.crewId" aria-label="Cuadrilla"><option value="">Todas</option><option
      v-for="c in crews"
      :key="c.id"
      :value="c.id"
    >{{ c.label }}</option></select></label>
    <label>Estado<select v-model="fields.status" aria-label="Estado"><option value="">Todos</option><option value="submitted">Enviada</option><option value="validated">Validada</option><option value="inactive">Ausente</option></select></label>
    <label>Agrupar por<select v-model="fields.grain" aria-label="Agrupar por"><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option></select></label>
    <button
      class="btn btn--primary"
      type="submit"
    >
      Aplicar filtros
    </button>
    <p
      v-if="error"
      role="alert"
    >
      {{ error }} <button
        type="button"
        class="btn"
        @click="directories"
      >
        Reintentar opciones
      </button>
    </p>
  </form>
</template>
<style scoped>
.rv-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding:18px;align-items:end}.rv-filters label{display:grid;gap:6px;font-size:.8rem;font-weight:600;min-width:0}.rv-filters input,.rv-filters select{width:100%;min-width:0;height:40px;border:1px solid #ccd6e2;border-radius:7px;padding:0 10px;background:#fff;color:#192940}.rv-filters p{grid-column:1/-1;margin:0}@media(max-width:1000px){.rv-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.rv-filters{grid-template-columns:1fr}}
</style>
