<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { cabinetsApi } from "./cabinets.api";
import type {
  CabinetAdminList,
  CabinetAdminMetrics,
} from "./cabinets.generated";
import { useCabinetResource } from "./cabinets.resource";
import {
  readQuery,
  writeQuery,
  filterParams,
  validateQuery,
} from "./cabinets.query";
import { label, date, displayModel, text } from "./cabinets.format";
import CabinetDashboardSection from "./CabinetDashboardSection.vue";
import CabinetFilters from "./CabinetFilters.vue";
import "./cabinets.css";
const route = useRoute(),
  router = useRouter();
const current = computed(() => readQuery(route.query));
const draft = reactive({ ...current.value.filters }),
  size = ref(current.value.pageSize),
  validation = ref("");
const list = useCabinetResource<CabinetAdminList>(),
  choices = useCabinetResource<CabinetAdminMetrics>();
const companies = computed(
  () =>
    choices.data.value?.companies
      .filter((c) => c.crewId)
      .map((c) => ({ id: c.crewId!, name: c.crewName || "Sin nombre" })) || [],
);
const params = computed(() => filterParams(current.value.filters));
function load() {
  validation.value = validateQuery(current.value.filters);
  if (validation.value) list.clear();
  if (!validation.value)
    void list.load((signal) =>
      cabinetsApi.list(
        {
          ...params.value,
          page: current.value.page,
          pageSize: current.value.pageSize,
        },
        signal,
      ),
    );
}
watch(
  () => route.query,
  () => {
    Object.assign(draft, current.value.filters);
    size.value = current.value.pageSize;
    load();
  },
  { immediate: true },
);
onMounted(() => choices.load((signal) => cabinetsApi.metrics({}, signal)));
function apply() {
  validation.value = validateQuery(draft);
  if (validation.value) return;
  void router.push({ query: writeQuery(draft, 1, size.value) });
}
function page(value: number) {
  void router.push({
    query: {...writeQuery(current.value.filters, value, current.value.pageSize), missingPartName:route.query.missingPartName},
  });
}
function clear() {
  Object.assign(draft, readQuery({}).filters);
  size.value = 25;
  validation.value = "";
  void router.push({ query: {} });
}
const detailLink = (id: string) => ({
  path: `/levantamientos/nuevos-hidrantes/${id}`,
  query: route.query,
});
</script>
<template>
  <main class="content cabinets cabinet-stack">
    <header class="cabinet-head">
      <div>
        <h1 class="page-title">
          Levantamientos / Nuevos Hidrantes
        </h1>
        <p class="page-subtitle">
          Seguimiento de registro, instalación y revisión final
        </p>
      </div>
      <RouterLink
        class="btn"
        to="/mapa?view=cabinets"
      >
        Mapa de Nuevos Hidrantes
      </RouterLink>
    </header>
    <CabinetDashboardSection
      v-if="!validateQuery(current.filters)"
      :filters="params"
    />
    <CabinetFilters
      :filters="draft"
      :companies="companies"
      :page-size="size"
      :error="validation"
      @update="(key, value) => (draft[key] = value)"
      @size="size = $event"
      @apply="apply"
      @clear="clear"
    />
    <p
      v-if="choices.error.value"
      class="cabinet-muted"
    >
      No fue posible cargar las opciones de empresa.
      <button
        class="btn"
        @click="choices.load((signal) => cabinetsApi.metrics({}, signal))"
      >
        Reintentar empresas
      </button>
    </p>
    <section class="card cabinet-stack">
      <h2>Listado de Nuevos Hidrantes</h2>
      <p
        v-if="current.filters.missingPartCode"
        role="status"
      >
        Gabinetes con faltante: {{ route.query.missingPartName || choices.data.value?.missingParts?.find(p => p.partCode === current.filters.missingPartCode)?.displayName || current.filters.missingPartCode }}
      </p>
      <p
        v-if="list.loading.value"
        role="status"
        class="cabinet-loading"
      >
        Cargando nuevos hidrantes…
      </p>
      <div
        v-else-if="list.error.value"
        role="alert"
        class="cabinet-error"
      >
        {{ list.error.value }}
        <button
          class="btn"
          @click="load"
        >
          Reintentar listado
        </button>
      </div>
      <template v-else-if="list.data.value">
        <p>
          {{ list.data.value.total }} registros · página
          {{ list.data.value.page }} de {{ list.data.value.totalPages }}
        </p>
        <p v-if="!list.data.value.items.length">
          No hay nuevos hidrantes que coincidan con los filtros.
        </p>
        <div
          v-else
          class="cabinet-scroll"
        >
          <table class="cabinet-table">
            <thead>
              <tr>
                <th>UID</th>
                <th v-if="current.filters.missingPartCode">
                  Unidades faltantes de la pieza
                </th>
                <th>Modelo</th>
                <th>Estado</th>
                <th>Base</th>
                <th>Cuenta instalación</th>
                <th>Empresa</th>
                <th>Registro</th>
                <th>Validación</th>
                <th>Instalación</th>
                <th>Revisión final</th>
                <th>Evidencia / último chequeo</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in list.data.value.items"
                :key="row.cabinetId"
              >
                <td data-label="UID">
                  <RouterLink :to="detailLink(row.cabinetId)">
                    {{ row.formattedUid }}
                  </RouterLink>
                </td>
                <td
                  v-if="current.filters.missingPartCode"
                  data-label="Unidades faltantes de la pieza"
                >
                  {{ row.missingUnits }}
                </td>
                <td data-label="Modelo">
                  {{ displayModel(row) }}
                </td>
                <td data-label="Estado">
                  <span :class="['cabinet-badge', row.status]">{{
                    label(row.status)
                  }}</span>
                </td>
                <td data-label="Base">
                  {{ row.base?.displayIdentifier || "—" }}
                </td>
                <td data-label="Cuenta instalación">
                  {{ text(row.installationAccountNumber)
                  }}<small
                    v-if="row.accountDiscrepancy"
                    class="cabinet-warning"
                  >Cuenta distinta a la base</small>
                </td>
                <td data-label="Empresa">
                  {{ row.crew?.name || "Sin empresa / Sin asignación" }}
                </td>
                <td data-label="Registro">
                  {{ date(row.registeredAt) }}
                </td>
                <td data-label="Validación">
                  {{ date(row.validatedAt) }}
                </td>
                <td data-label="Instalación">
                  {{ date(row.installedAt) }}
                </td>
                <td data-label="Revisión final">
                  {{ label(row.finalReviewState) }}<br>{{
                    date(row.reviewedAt)
                  }}
                </td>
                <td data-label="Evidencia / último chequeo">
                  {{ row.photos.total }} fotos ·
                  {{ row.photos.problemsAtLastCheck }} problemas ·
                  {{ row.photos.unknown }} desconocidas<small>{{
                    date(row.photos.oldestCheckAt)
                  }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <nav
          class="cabinet-actions"
          aria-label="Paginación de Nuevos Hidrantes"
        >
          <button
            class="btn"
            :disabled="list.data.value.page <= 1"
            @click="page(list.data.value.page - 1)"
          >
            Anterior
          </button><span>Página {{ list.data.value.page }}</span><button
            class="btn"
            :disabled="list.data.value.page >= list.data.value.totalPages"
            @click="page(list.data.value.page + 1)"
          >
            Siguiente
          </button>
        </nav>
      </template>
    </section>
  </main>
</template>
