<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { dashboardService } from '@/services/dashboard'
import { problemMessage } from '@/api/client'
const result = ref<Awaited<ReturnType<typeof dashboardService.withdrawnInspections>>>(), page = ref(1), loading = ref(false), error = ref('')
async function load(next = page.value) {
  loading.value = true; error.value = ''
  try { result.value = await dashboardService.withdrawnInspections(next); page.value = next }
  catch(e) { error.value = problemMessage(e) }
  finally { loading.value = false }
}
const date = (value: string) => new Intl.DateTimeFormat('es-MX', {dateStyle:'medium', timeStyle:'short', timeZone:'America/Hermosillo'}).format(new Date(value))
onMounted(() => load())
</script>

<template>
  <section class="content">
    <div class="page-head"><div><h1 class="page-title">Archivo de bajas RV</h1>
      <p class="page-subtitle">Historial y evidencia conservados. Acceso administrativo.</p></div>
      <RouterLink class="btn" to="/revisiones">Volver a revisiones</RouterLink></div>
    <p v-if="error" class="error-box" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Cargando archivo…</p>
    <template v-else-if="result">
      <p>{{ result.total }} revisiones dadas de baja</p>
      <p v-if="!result.items.length" class="card empty">No hay revisiones dadas de baja.</p>
      <div class="archive-list">
        <article v-for="item in result.items" :key="item.inspectionId" class="card archive-item">
          <h2>Hidrante {{ item.accountNumber }} · Rev. #{{ item.revisionNumber }}</h2>
          <p>Técnico: {{ item.technicianName }}</p>
          <p><strong>Motivo:</strong> {{ item.reason }}</p>
          <p class="muted">{{ date(item.withdrawnAt) }} · {{ item.withdrawnBy }}</p>
          <RouterLink class="btn" :to="`/revisiones/${item.inspectionId}?archived=true`">Consultar historial y evidencia</RouterLink>
        </article>
      </div>
      <div class="pagination"><button class="btn" :disabled="page <= 1" @click="load(page - 1)">Anterior</button>
        <span>Página {{ page }}</span><button class="btn" :disabled="page * result.pageSize >= result.total" @click="load(page + 1)">Siguiente</button></div>
    </template>
  </section>
</template>

<style scoped>
.archive-list { display: grid; gap: 16px; } .archive-item, .empty { padding: 20px; }
.archive-item h2 { font-size: 1.1rem; } .archive-item p { overflow-wrap: anywhere; }
.pagination { display: flex; gap: 16px; align-items: center; justify-content: center; margin-top: 24px; }
</style>
