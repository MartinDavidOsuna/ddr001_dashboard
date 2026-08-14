<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import {
  Search,
  SlidersHorizontal,
  Eye,
  MapPin,
  Signal,
  Camera,
} from "@lucide/vue";
import AppStatus from "@/components/AppStatus.vue";
import { dashboardService } from "@/services/dashboard";
import { problemMessage } from "@/api/client";
import type { FilterOption, InspectionListItem, Page } from "@/api/types";
const page = ref<Page<InspectionListItem>>(),
  loading = ref(false),
  error = ref(""),
  showFilters = ref(false),
  technicians = ref<FilterOption[]>([]),
  crews = ref<FilterOption[]>([]),
  statuses = ref<string[]>([]);
const filters = reactive({
  page: 1,
  pageSize: 25,
  search: "",
  userId: "",
  crewId: "",
  status: "",
  from: "",
  to: "",
  gps: "",
});
let timer = 0;
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const params: any = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== ""),
    );
    if (params.from)
      params.from = new Date(`${params.from}T00:00:00-07:00`).toISOString();
    if (params.to) {
      const end = new Date(`${params.to}T00:00:00-07:00`);
      end.setDate(end.getDate() + 1);
      params.to = end.toISOString();
    }
    page.value = await dashboardService.inspections(params);
  } catch (e) {
    error.value = problemMessage(e, "No fue posible cargar las revisiones.");
  } finally {
    loading.value = false;
  }
}
function debounce() {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    filters.page = 1;
    load();
  }, 350);
}
function reset() {
  Object.assign(filters, {
    page: 1,
    pageSize: 25,
    search: "",
    userId: "",
    crewId: "",
    status: "",
    from: "",
    to: "",
    gps: "",
  });
  load();
}
function date(v: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Hermosillo",
  }).format(new Date(v));
}
onMounted(async () => {
  const f = await dashboardService.filters();
  technicians.value = f.technicians;
  crews.value = f.crews;
  statuses.value = f.statuses;
  await load();
});
watch(() => filters.page, load);
</script>
<template>
  <div class="content list-content">
    <div class="page-head">
      <div>
        <h1 class="page-title">Revisiones visuales</h1>
        <p class="page-subtitle">Listado y filtrado de inspecciones reales</p>
      </div>
      <span v-if="page" class="muted desktop-only"
        >{{ page.total.toLocaleString() }} registros</span
      >
    </div>
    <div class="list-toolbar">
      <div class="search">
        <Search :size="18" /><label class="sr-only" for="search"
          >Buscar hidrante o técnico</label
        ><input
          id="search"
          v-model="filters.search"
          placeholder="Buscar por hidrante o técnico…"
          @input="debounce"
        />
      </div>
      <button
        class="btn"
        :aria-expanded="showFilters"
        @click="showFilters = !showFilters"
      >
        <SlidersHorizontal :size="17" /> Filtros
      </button>
    </div>
    <section v-if="showFilters" class="filters card">
      <div class="field">
        <label>Técnico</label
        ><select v-model="filters.userId">
          <option value="">Todos</option>
          <option v-for="x in technicians" :key="x.id" :value="x.id">
            {{ x.label }}
          </option>
        </select>
      </div>
      <div class="field">
        <label>Cuadrilla</label
        ><select v-model="filters.crewId">
          <option value="">Todas</option>
          <option v-for="x in crews" :key="x.id" :value="x.id">
            {{ x.label }}
          </option>
        </select>
      </div>
      <div class="field">
        <label>Estado</label
        ><select v-model="filters.status">
          <option value="">Todos</option>
          <option v-for="x in statuses" :key="x" :value="x">{{ x }}</option>
        </select>
      </div>
      <div class="field">
        <label>Desde</label><input v-model="filters.from" type="date" />
      </div>
      <div class="field">
        <label>Hasta</label><input v-model="filters.to" type="date" />
      </div>
      <div class="field">
        <label>GPS</label
        ><select v-model="filters.gps">
          <option value="">Cualquiera</option>
          <option value="present">Presente</option>
          <option value="absent">Ausente</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn" @click="reset">Limpiar</button
        ><button
          class="btn btn--primary"
          @click="
            filters.page = 1;
            load();
          "
        >
          Aplicar
        </button>
      </div>
    </section>
    <div v-if="error" class="error-box">{{ error }}</div>
    <div v-else-if="loading" class="table-card card">
      <div v-for="n in 8" :key="n" class="row-skeleton skeleton" />
    </div>
    <template v-else-if="page?.items.length"
      ><div class="table-card card desktop-table">
        <table>
          <thead>
            <tr>
              <th>Hidrante</th>
              <th>Técnico / cuadrilla</th>
              <th>Fecha</th>
              <th>Rev.</th>
              <th>Estado</th>
              <th>Fotos</th>
              <th>GPS</th>
              <th>Señal</th>
              <th>Actualización</th>
              <th><span class="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="x in page.items" :key="x.inspectionId">
              <td>
                <RouterLink
                  class="account"
                  :to="`/revisiones/${x.inspectionId}`"
                  >{{ x.accountNumber }}</RouterLink
                >
              </td>
              <td>
                <b>{{ x.technicianName }}</b
                ><small>{{ x.crewName || "Sin cuadrilla" }}</small>
              </td>
              <td>{{ date(x.startedAt) }}</td>
              <td class="mono">#{{ x.revisionNumber }}</td>
              <td><AppStatus :status="x.status" /></td>
              <td>
                <span class="photo-count" :class="{ missing: !x.mandatoryPhotosComplete }">
                  <Camera :size="15" />
                  <b>{{ x.mandatoryPhotosCompleted }}/{{ x.mandatoryPhotosRequired }}</b>
                  obligatorias
                  <small>{{ x.totalPhotos }} total</small>
                </span>
              </td>
              <td>
                <span class="signal-cell" :class="{ missing: !x.hasGps }"
                  ><MapPin :size="15" />{{
                    x.hasGps
                      ? x.gpsAccuracyM
                        ? `${x.gpsAccuracyM} m`
                        : "Sí"
                      : "Sin GPS"
                  }}</span
                >
              </td>
              <td>
                <span class="signal-cell" :class="{ missing: !x.hasSignal }"
                  ><Signal :size="15" />{{
                    x.hasSignal
                      ? [
                          x.signalGeneration,
                          x.signalDbm != null ? `${x.signalDbm} dBm` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Sin señal"
                  }}</span
                >
              </td>
              <td>{{ date(x.updatedAt) }}</td>
              <td>
                <RouterLink class="view" :to="`/revisiones/${x.inspectionId}`"
                  ><Eye :size="16" />Ver</RouterLink
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mobile-list">
        <article
          v-for="x in page.items"
          :key="x.inspectionId"
          class="card review-card"
        >
          <header>
            <RouterLink class="account" :to="`/revisiones/${x.inspectionId}`"
              >Hidrante {{ x.accountNumber }}</RouterLink
            ><AppStatus :status="x.status" />
          </header>
          <b>{{ x.technicianName }}</b
          ><small
            >{{ x.crewName || "Sin cuadrilla" }} ·
            {{ date(x.startedAt) }}</small
          >
          <div>
            <span
              ><Camera :size="15" />{{ x.mandatoryPhotosCompleted }}/{{
                x.mandatoryPhotosRequired
              }} · {{ x.totalPhotos }} total</span
            ><span><MapPin :size="15" />{{ x.hasGps ? "GPS" : "Sin GPS" }}</span
            ><span
              ><Signal :size="15" />{{
                x.signalGeneration || "Sin señal"
              }}</span
            >
          </div>
          <RouterLink class="btn" :to="`/revisiones/${x.inspectionId}`"
            ><Eye :size="16" />Ver revisión</RouterLink
          >
        </article>
      </div>
      <footer class="pagination">
        <span
          >{{ (page.page - 1) * page.pageSize + 1 }}–{{
            Math.min(page.page * page.pageSize, page.total)
          }}
          de {{ page.total }}</span
        ><label
          >Por página
          <select
            v-model.number="filters.pageSize"
            @change="
              filters.page = 1;
              load();
            "
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select></label
        ><button
          class="btn"
          :disabled="page.page === 1"
          @click="filters.page--"
        >
          Anterior</button
        ><button
          class="btn"
          :disabled="page.page * page.pageSize >= page.total"
          @click="filters.page++"
        >
          Siguiente
        </button>
      </footer></template
    >
    <div v-else class="empty-box">
      <h2>Sin revisiones</h2>
      <p class="muted">No existen resultados para los filtros seleccionados.</p>
      <button class="btn" @click="reset">Limpiar filtros</button>
    </div>
  </div>
</template>
<style scoped>
.list-content {
  max-width: none;
}
.list-toolbar {
  display: flex;
  gap: 9px;
  margin-bottom: 12px;
}
.search {
  height: 42px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #cdd7e2;
  border-radius: 7px;
  color: #71849c;
}
.search input {
  border: 0;
  outline: 0;
  flex: 1;
  min-width: 0;
}
.filters {
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 13px;
}
.filter-actions {
  display: flex;
  gap: 8px;
  align-items: end;
}
.table-card {
  overflow: auto;
}
.table-card table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  white-space: nowrap;
}
.table-card th {
  text-align: left;
  color: #5d718c;
  background: #f8fafc;
  font-size: 0.68rem;
  text-transform: uppercase;
  padding: 12px;
}
.table-card td {
  padding: 13px 12px;
  border-top: 1px solid #edf1f5;
}
.table-card td:nth-child(2) {
  display: grid;
  gap: 3px;
}
.table-card td small {
  color: #73869e;
}
.account,
.view {
  color: #135bd6;
  text-decoration: none;
  font-family: ui-monospace, monospace;
  font-weight: 650;
}
.view {
  display: flex;
  gap: 5px;
  align-items: center;
}
.signal-cell {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: #247d4b;
}
.signal-cell.missing {
  color: #a73434;
}
.photo-count {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 2px 5px;
  color: #247d4b;
}
.photo-count small {
  grid-column: 2;
  color: #71849b;
}
.photo-count.missing {
  color: #a66a00;
}
.row-skeleton {
  height: 42px;
  margin: 10px;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 14px;
  font-size: 0.78rem;
}
.pagination span {
  margin-right: auto;
}
.pagination label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pagination select {
  height: 35px;
}
.mobile-list {
  display: none;
}
.review-card {
  padding: 14px;
  display: grid;
  gap: 9px;
}
.review-card header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.review-card small {
  color: var(--muted);
}
.review-card > div {
  display: flex;
  gap: 15px;
}
.review-card > div span {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 0.78rem;
}
@media (max-width: 1150px) {
  .filters {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 900px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
  .filter-actions {
    grid-column: 1/-1;
  }
  .desktop-table {
    display: none;
  }
  .mobile-list {
    display: grid;
    gap: 10px;
  }
  .pagination {
    flex-wrap: wrap;
  }
  .pagination span {
    width: 100%;
    margin: 0;
  }
  .list-toolbar .btn {
    padding: 9px;
  }
  .review-card .status {
    font-size: 0.68rem;
  }
}
@media (max-width: 430px) {
  .filters {
    grid-template-columns: 1fr;
  }
  .filter-actions {
    grid-column: auto;
  }
}
</style>
