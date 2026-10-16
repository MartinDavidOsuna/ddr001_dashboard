<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { dashboardService } from '@/services/dashboard';
import { problemMessage } from '@/api/client';
import type { InspectionListItem } from '@/api/types';
import InspectionListBody from './InspectionListBody.vue';
const items = ref<InspectionListItem[]>([]), loading = ref(true), error = ref('');
async function load() { loading.value = true; error.value = ''; try { items.value = (await dashboardService.inspections({ page: 1, pageSize: 10 })).items; } catch (e) { error.value = problemMessage(e, 'No fue posible cargar las Últimas revisiones.'); } finally { loading.value = false; } }
onMounted(load);
</script>
<template>
  <section aria-labelledby="recent-title">
    <h2 id="recent-title">
      Últimas revisiones
    </h2><p class="muted">
      Últimas 10 por fecha de inicio · Actividad general RV, independiente del universo analítico filtrado.
    </p><div
      v-if="loading"
      class="skeleton recent-loading"
      aria-label="Cargando Últimas revisiones"
    /><p
      v-else-if="error"
      role="alert"
    >
      {{ error }} <button
        class="btn"
        @click="load"
      >
        Reintentar
      </button>
    </p><InspectionListBody
      v-else-if="items.length"
      :items="items"
    /><p
      v-else
      class="empty-box"
    >
      Sin revisiones.
    </p><RouterLink
      class="btn"
      to="/revisiones/listado"
    >
      Ver todas las revisiones
    </RouterLink>
  </section>
</template>
<style scoped>.recent-loading{height:220px}section>.btn{margin-top:16px}</style>
