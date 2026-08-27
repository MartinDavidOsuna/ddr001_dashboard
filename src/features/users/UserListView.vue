<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { Search, SlidersHorizontal, UserRound, Eye } from "@lucide/vue";
import { dashboardService } from "@/services/dashboard";
import { problemMessage } from "@/api/client";
import type { DashboardUser, FilterOption, Page, UserFilters } from "@/api/types";
import { userDate, userInitials } from "./user-format";

const page = ref<Page<DashboardUser>>();
const crews = ref<FilterOption[]>([]);
const loading = ref(false);
const error = ref("");
const showFilters = ref(false);
const filters = reactive({
  page: 1,
  pageSize: 25 as 25 | 50 | 100,
  search: "",
  crewId: "",
  status: "",
  activity: "",
});
let timer = 0;

function requestFilters(): UserFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== ""),
  ) as unknown as UserFilters;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    page.value = await dashboardService.users(requestFilters());
  } catch (cause) {
    error.value = problemMessage(cause, "No fue posible cargar los usuarios.");
  } finally {
    loading.value = false;
  }
}
function search() {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    filters.page = 1;
    load();
  }, 350);
}
function apply() {
  filters.page = 1;
  load();
}
function reset() {
  Object.assign(filters, { page: 1, pageSize: 25, search: "", crewId: "", status: "", activity: "" });
  load();
}

onMounted(async () => {
  try {
    crews.value = (await dashboardService.filters()).crews;
  } catch {
    crews.value = [];
  }
  await load();
});
watch(() => filters.page, load);
</script>

<template>
  <div class="content user-content">
    <div class="page-head">
      <div><h1 class="page-title">Usuarios</h1><p class="page-subtitle">Técnicos de campo y su actividad operativa</p></div>
      <span v-if="page" class="muted desktop-only">{{ page.total.toLocaleString() }} usuarios</span>
    </div>
    <div class="user-toolbar">
      <label class="search"><Search :size="18"/><span class="sr-only">Buscar usuario</span><input v-model.trim="filters.search" placeholder="Buscar nombre, correo, teléfono o número…" @input="search" /></label>
      <button class="btn" :aria-expanded="showFilters" @click="showFilters = !showFilters"><SlidersHorizontal :size="17"/>Filtros</button>
    </div>
    <section v-if="showFilters" class="filters card">
      <div class="field"><label>Cuadrilla</label><select v-model="filters.crewId"><option value="">Todas</option><option v-for="crew in crews" :key="crew.id" :value="crew.id">{{ crew.label }}</option></select></div>
      <div class="field"><label>Estado</label><select v-model="filters.status"><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
      <div class="field"><label>Actividad</label><select v-model="filters.activity"><option value="">Cualquiera</option><option value="with_inspections">Con revisiones</option><option value="without_inspections">Sin revisiones</option></select></div>
      <div class="filter-actions"><button class="btn" @click="reset">Limpiar</button><button class="btn btn--primary" @click="apply">Aplicar</button></div>
    </section>
    <div v-if="error" class="error-box">{{ error }} <button class="btn" @click="load">Reintentar</button></div>
    <div v-else-if="loading" class="user-grid"><div v-for="n in 8" :key="n" class="card user-card skeleton-card"><span class="skeleton"/><span class="skeleton"/><span class="skeleton"/></div></div>
    <template v-else-if="page?.items.length">
      <div class="user-grid">
        <article v-for="user in page.items" :key="user.userId" class="card user-card">
          <header><span class="avatar" aria-hidden="true">{{ userInitials(user.fullName) }}</span><div><RouterLink :to="`/usuarios/${user.userId}`">{{ user.fullName }}</RouterLink><span class="state" :class="{ inactive: !user.isActive }">{{ user.isActive ? "Activo" : "Inactivo" }}</span></div></header>
          <dl><div><dt>Cuadrilla</dt><dd>{{ user.crewName || "Sin asignar" }}</dd></div><div><dt>Revisiones</dt><dd>{{ user.inspectionCount.toLocaleString() }}</dd></div><div><dt>Última actividad</dt><dd>{{ userDate(user.lastActivityAt) }}</dd></div><div><dt>Sesiones activas</dt><dd>{{ user.activeSessionCount }}</dd></div></dl>
          <p class="contact">{{ user.email || user.phone || "Sin datos de contacto" }}</p>
          <RouterLink class="btn" :to="`/usuarios/${user.userId}`"><Eye :size="16"/>Ver detalle</RouterLink>
        </article>
      </div>
      <footer class="pagination card"><span>{{ (page.page - 1) * page.pageSize + 1 }}–{{ Math.min(page.page * page.pageSize, page.total) }} de {{ page.total }}</span><label>Por página <select v-model.number="filters.pageSize" @change="apply"><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></label><button class="btn" :disabled="page.page === 1" @click="filters.page--">Anterior</button><button class="btn" :disabled="page.page * page.pageSize >= page.total" @click="filters.page++">Siguiente</button></footer>
    </template>
    <div v-else class="empty-box"><UserRound :size="30"/><h2>Sin usuarios</h2><p class="muted">No existen resultados para los filtros seleccionados.</p><button class="btn" @click="reset">Limpiar filtros</button></div>
  </div>
</template>

<style scoped>
.user-content{max-width:none}.user-toolbar{display:flex;gap:9px;margin-bottom:12px}.search{height:42px;flex:1;display:flex;align-items:center;gap:9px;padding:0 12px;background:#fff;border:1px solid #cdd7e2;border-radius:7px;color:#71849c}.search input{border:0;outline:0;flex:1;min-width:0}.filters{padding:14px;display:grid;grid-template-columns:repeat(3,minmax(160px,1fr)) auto;gap:12px;margin-bottom:14px}.filter-actions{display:flex;align-items:end;gap:8px}.user-grid{display:grid;grid-template-columns:repeat(4,minmax(230px,1fr));gap:12px}.user-card{padding:16px;display:grid;gap:14px}.user-card header{display:flex;align-items:center;gap:11px}.user-card header>div{display:grid;gap:4px;min-width:0}.user-card header a{font-weight:700;color:#173d78;text-decoration:none;overflow:hidden;text-overflow:ellipsis}.avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#e9f1ff;color:#1557bd;font-weight:750;flex:none}.state{font-size:.72rem;color:#087a3b}.state.inactive{color:#a52c2c}.user-card dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0}.user-card dl div{min-width:0}.user-card dt{font-size:.7rem;color:var(--muted);text-transform:uppercase}.user-card dd{margin:3px 0 0;font-size:.82rem;font-weight:650}.contact{margin:0;color:var(--muted);font-size:.78rem;overflow-wrap:anywhere}.skeleton-card .skeleton{display:block;height:42px}.pagination{display:flex;align-items:center;gap:9px;padding:14px;margin-top:14px;font-size:.78rem}.pagination span{margin-right:auto}.pagination label{display:flex;align-items:center;gap:6px}.pagination select{height:35px}.empty-box svg{color:#6e819a}.error-box .btn{margin-left:12px}@media(max-width:1200px){.user-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:900px){.user-grid{grid-template-columns:repeat(2,1fr)}.filters{grid-template-columns:1fr 1fr}.filter-actions{grid-column:1/-1}.pagination{flex-wrap:wrap}.pagination span{width:100%;margin:0}}@media(max-width:560px){.user-grid{grid-template-columns:1fr}.filters{grid-template-columns:1fr}.filter-actions{grid-column:auto}.user-toolbar .btn{padding:9px}.pagination label{width:100%}}
</style>
