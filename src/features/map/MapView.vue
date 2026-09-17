<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import {
  Map as MapIcon,
  Droplet,
  ClipboardCheck,
  HardHat,
  Activity,
  Layers,
  Search,
  SlidersHorizontal,
} from "@lucide/vue";
import MapCanvas from "./MapCanvas.vue";
import MapPopupCard from "./MapPopupCard.vue";
import {
  domains,
  domainInfo,
  type Bounds,
  type Domain,
  type MapView,
  type MapItem,
} from "./map.types";
import {
  readMapQuery,
  filterFields,
  prefix,
  filterCount,
  validateFilters,
} from "./map.filters";
import { useMapLayers } from "./map.state";
import "./map.css";
import { statusStyle, legendEntries } from "./map.colors";
import { groupNearbyHydrants } from "./map.grouping";
import { mapStatus } from "./map.api.datasource";
const route = useRoute(),
  router = useRouter();
const current = computed(() => readMapQuery(route.query));
const draft = reactive({ ...current.value.filters }),
  validation = ref(""),
  filtersOpen = ref(false),
  resultsOpen = ref(false);
const bbox = ref<Bounds>(),
  fitKey = ref(0),
  selected = ref<MapItem>();
const { state, load } = useMapLayers();
const active = computed(() =>
  current.value.view === "all"
    ? current.value.layers
    : [
        current.value.view === "reviews"
          ? "hydrants"
          : (current.value.view as Domain),
      ],
);
const items = computed(() =>
  active.value
    .flatMap((d) => state[d].items)
    .map((item) =>
      current.value.view === "reviews" && item.domain === "hydrants"
        ? {
            ...item,
            statusCode: item.latestInspectionStatus || "unknown",
            status: mapStatus(item.latestInspectionStatus),
          }
        : item,
    ),
);
const groupingEnabled = ref(true);
const canvasItems = computed(() => groupingEnabled.value ? groupNearbyHydrants(items.value) : items.value);
const neighbors = computed(
  () =>
    canvasItems.value.find(
      (i) =>
        i.key === selected.value?.key ||
        i.members?.some((m) => m.key === selected.value?.key),
    )?.members || [],
);
const layerName = (d: Domain) =>
  d === "hydrants" && current.value.view === "reviews"
    ? "Revisiones"
    : domainInfo[d].name;
const fields = (d: Domain) =>
  filterFields[d].filter(
    (f) => current.value.view !== "reviews" || f.key !== "hasInspections",
  );
const selectedKey = computed({
  get: () => selected.value?.key,
  set: (key: string | undefined) => {
    selected.value = key ? items.value.find((i) => i.key === key) : undefined;
  },
});
const visibleItems = computed(() =>
  items.value.filter(
    (i) =>
      !bbox.value ||
      (i.latitude >= bbox.value.south &&
        i.latitude <= bbox.value.north &&
        (bbox.value.west <= bbox.value.east
          ? i.longitude >= bbox.value.west && i.longitude <= bbox.value.east
          : i.longitude >= bbox.value.west || i.longitude <= bbox.value.east)),
  ),
);
const mixedCount = computed(() => canvasItems.value
  .filter(i => i.statusCode === "mixed")
  .reduce((count, i) => count + (i.members || []).filter(m => visibleItems.value.some(v => v.key === m.key)).length, 0));
const resultLimit = ref(50);
const loading = computed(() => active.value.some((d) => state[d].loading));
const count = computed(() =>
  filterCount(current.value.filters, current.value.view),
);
const groups = computed(() => active.value);
const icons = {
  hydrants: Droplet,
  reviews: ClipboardCheck,
  construction: HardHat,
  diagnostics: Activity,
};
function refresh(reset = false) {
  void load(
    active.value,
    {
      ...current.value.filters,
      ...(current.value.view === "reviews" ? { h_hasInspections: "true" } : {}),
    },
    undefined,
    reset,
  );
}
watch(
  () => route.query,
  () => {
    for (const k of Object.keys(draft)) delete draft[k];
    Object.assign(draft, current.value.filters);
    for (const domain of domains)
      for (const field of filterFields[domain])
        draft[prefix[domain] + field.key] ??= "";
    bbox.value = undefined;
    fitKey.value++;
    selectedKey.value = undefined;
    resultLimit.value = 50;
    refresh(true);
  },
  { immediate: true },
);
function setBounds(value: Bounds) {
  if (JSON.stringify(value) === JSON.stringify(bbox.value)) return;
  bbox.value = value;
}
// Panning only filters the cached results locally; it never requests new data.
// Explicit close, filter changes and layer/view changes clear the one shared selection.
watch(items, () => {
  const fresh = items.value.find((i) => i.key === selectedKey.value);
  if (fresh) selected.value = fresh;
});
function changeView(view: MapView) {
  const query: LocationQueryRaw = { ...route.query, view };
  // A dedicated universe tab must not inherit RV constraints from the Reviews tab.
  if (view === "hydrants" || view === "reviews") {
    for (const key of Object.keys(query))
      if (key.startsWith("h_") || key === "from" || key === "to")
        delete query[key];
  }
  void router.push({ query });
}
function apply() {
  validation.value = validateFilters(draft);
  if (validation.value) return;
  void router.push({
    query: {
      view: current.value.view,
      ...(current.value.view === "all"
        ? { layers: active.value.join(",") }
        : {}),
      ...Object.fromEntries(Object.entries(draft).filter(([, v]) => v)),
    },
  });
  filtersOpen.value = false;
}
function clear() {
  void router.push({ query: { view: current.value.view } });
  validation.value = "";
}
function toggleLayer(domain: Domain) {
  const layers = active.value.includes(domain)
    ? active.value.filter((d) => d !== domain)
    : [...active.value, domain];
  void router.push({ query: { ...route.query, layers: layers.join(",") } });
}
function select(key: string) {
  selectedKey.value = key;
  resultsOpen.value = false;
  const index = visibleItems.value.findIndex((item) => item.key === key);
  if (index >= resultLimit.value)
    resultLimit.value = Math.ceil((index + 1) / 50) * 50;
  void nextTick(() => {
    const result = document.querySelector<HTMLElement>(".map-result.active");
    if (result?.offsetParent)
      result.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}
function recenter() {
  bbox.value = undefined;
  fitKey.value++;
}
</script>
<template>
  <main class="content global-map-page" @keydown.esc="selectedKey = undefined">
    <header class="map-heading">
      <div>
        <h1 class="page-title"><MapIcon :size="24" /> Mapa</h1>
        <p class="page-subtitle">
          Explora el trabajo en territorio y abre sus expedientes.
        </p>
      </div>
      <div class="map-heading-actions">
        <button
          class="btn"
          :disabled="loading || !active.length"
          @click="refresh()"
        >
          Actualizar
        </button>
        <button class="btn" @click="recenter">Ver conjunto</button>
      </div>
    </header>
    <nav class="map-views" aria-label="Vista del mapa">
      <button
        v-for="view in [
          'all',
          'hydrants',
          'reviews',
          'construction',
          'diagnostics',
        ] as const"
        :key="view"
        class="btn"
        :aria-pressed="current.view === view"
        @click="changeView(view)"
      >
        <component :is="view === 'all' ? Layers : icons[view]" :size="17" />{{
          view === "all"
            ? "Todos"
            : view === "reviews"
              ? "Revisiones"
              : domainInfo[view].name
        }}
      </button>
    </nav>
    <form class="map-controls card" @submit.prevent="apply">
      <div class="map-search-row">
        <label class="map-search"
          ><Search :size="18" /><input
            v-model="draft.search"
            aria-label="Buscar en el mapa"
            placeholder="Buscar cuenta, identificador, medidor o técnico"
            minlength="2"
            maxlength="100" /></label
        ><button class="btn btn-primary">Buscar</button
        ><button
          type="button"
          class="btn"
          :aria-expanded="filtersOpen"
          @click="filtersOpen = !filtersOpen"
        >
          <SlidersHorizontal :size="16" />Filtros
          <span v-if="count">({{ count }})</span></button
        ><button v-if="count" type="button" class="btn" @click="clear">
          Limpiar filtros
        </button>
      </div>
      <div v-if="current.view === 'all'" class="map-layers" aria-label="Capas">
        <label v-for="d in domains" :key="d"
          ><input
            type="checkbox"
            :aria-label="domainInfo[d].name"
            :checked="active.includes(d)"
            @change="toggleLayer(d)"
          /><span :class="['map-symbol', d]">{{ domainInfo[d].symbol }}</span
          >{{ layerName(d) }}</label
        >
      </div>
      <div v-show="filtersOpen" class="map-filters">
        <p class="map-date-help">
          Fechas:
          {{
            current.view === "hydrants" || current.view === "reviews"
              ? "última revisión RV"
              : current.view === "construction"
                ? "creación del levantamiento"
                : current.view === "diagnostics"
                  ? "creación del caso"
                  : "última revisión RV · creación del levantamiento y del caso"
          }}. Días de Hermosillo.
        </p>
        <div class="map-filter-grid">
          <label>Desde<input v-model="draft.from" type="date" /></label
          ><label>Hasta<input v-model="draft.to" type="date" /></label>
        </div>
        <fieldset v-for="d in groups" :key="d">
          <legend>{{ layerName(d) }}</legend>
          <div class="map-filter-grid">
            <label v-for="field in fields(d)" :key="field.key"
              >{{ field.label
              }}<select
                v-if="field.options"
                :aria-label="field.label"
                v-model="draft[prefix[d] + field.key]"
              >
                <option v-if="field.key !== 'simulation'" value="">
                  Todos
                </option>
                <option v-for="[v, name] in field.options" :key="v" :value="v">
                  {{ name }}
                </option></select
              ><input
                v-else
                :aria-label="field.label"
                v-model="draft[prefix[d] + field.key]"
                :type="field.type || 'text'"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                :maxlength="field.key === 'testBenchId' ? 180 : 120"
                :placeholder="field.placeholder"
            /></label>
          </div>
        </fieldset>
        <button class="btn btn-primary">Aplicar filtros</button>
      </div>
      <p v-if="validation" role="alert" class="map-error">{{ validation }}</p>
    </form>
    <p v-if="active.includes('diagnostics')" class="map-data-note">
      {{
        current.filters.d_simulation === "exclude"
          ? "Diagnósticos: simulaciones excluidas."
          : current.filters.d_simulation === "only"
            ? "Diagnósticos: sólo SIMULACIONES."
            : "Diagnósticos: incluye SIMULACIONES."
      }}
      Ubicación: muestra GPS más reciente admitida.
    </p>
    <p v-if="current.view === 'reviews'" class="map-data-note">
      Sólo hidrantes con revisiones. Color: estado de la última revisión;
      ubicación maestra del hidrante.
    </p>
    <p v-if="current.view === 'hydrants'" class="map-data-note">
      Universo de hidrantes con coordenadas, con o sin revisiones. Color: avance
      RV. Los filtros y el encuadre delimitan los resultados.
    </p>
    <p class="map-data-note">
      Los puntos se cargan al cambiar de vista o filtros. Usa Actualizar para
      consultar cambios; mover o ampliar el mapa no vuelve a descargarlos.
    </p>
    <div class="map-status" aria-live="polite">
      <span v-if="loading" role="status">Cargando puntos…</span
      ><span
        >{{ items.length }} cargados · {{ visibleItems.length }} en el
        encuadre</span
      ><span v-for="d in active" :key="d"
        >{{ domainInfo[d].symbol }} {{ layerName(d) }}:
        {{ state[d].items.length }}</span
      >
    </div>
    <div
      v-for="d in active.filter((d) => state[d].error)"
      :key="d"
      role="alert"
      class="map-error"
    >
      {{ layerName(d) }}
      {{
        state[d].items.length
          ? "sin actualizar. Se conservan los puntos anteriores."
          : "no disponibles."
      }}
      {{ state[d].error }}
      <button class="btn" @click="refresh()">Reintentar</button>
    </div>
    <p v-if="active.some((d) => state[d].truncated)" class="map-notice">
      Se alcanzó el límite de una capa (2.000). Aplica filtros para explorar el
      resto. Los conteos no son totales globales.
    </p>
    <p v-if="!loading && !items.length" class="map-notice">
      {{
        !active.length
          ? "Activa una capa para explorar el mapa."
          : active.every((d) => state[d].error)
            ? "No se pudieron cargar las capas seleccionadas."
            : "No hay elementos con coordenadas válidas para estos filtros."
      }}
    </p>
    <div class="map-workspace">
      <aside
        class="map-results"
        :class="{ expanded: resultsOpen }"
        aria-label="Resultados del mapa"
      >
        <button
          class="btn map-results-toggle"
          :aria-expanded="resultsOpen"
          @click="resultsOpen = !resultsOpen"
        >
          Resultados ({{ visibleItems.length }})
        </button>
        <h2>En este encuadre</h2>
        <p class="map-muted">Selecciona un elemento para localizarlo.</p>
        <div class="map-results-list">
          <button
            v-for="item in visibleItems.slice(0, resultLimit)"
            :key="item.key"
            :data-key="item.key"
            class="map-result"
            :class="{ active: item.key === selectedKey }"
            :aria-pressed="item.key === selectedKey"
            @click="select(item.key)"
          >
            <span
              :class="['map-symbol', item.domain]"
              :style="{ color: statusStyle(item).color }"
              >{{ domainInfo[item.domain].symbol }}</span
            ><span
              ><small>{{ domainInfo[item.domain].singular }}</small
              ><strong>{{ item.title }}</strong
              ><span>{{ item.status }}</span
              ><b v-if="item.simulation" class="map-simulation"
                >SIMULACIÓN</b
              ></span
            ></button
          ><button
            v-if="visibleItems.length > resultLimit"
            class="btn"
            @click="resultLimit += 50"
          >
            Mostrar 50 más
          </button>
        </div>
      </aside>
      <div class="map-stage">
        <MapCanvas
          :items="items"
          :selected="selectedKey"
          :fit-key="fitKey"
          :ready="!loading"
          @select="select"
          @bounds="setBounds"
          @grouping="groupingEnabled = $event"
        />
        <details class="map-legend">
          <summary>Colores y estados</summary>
          <div class="map-legend-content">
            <section v-for="d in active" :key="d">
              <h3>
                <span :class="['map-symbol', d]">{{
                  domainInfo[d].symbol
                }}</span
                >{{ layerName(d) }}
              </h3>
              <p
                v-for="entry in legendEntries(visibleItems, d)"
                :key="entry.key"
              >
                <span
                  class="map-color-swatch"
                  :style="{ backgroundColor: entry.color }"
                ></span>
                {{ entry.label }} <small>({{ entry.count }})</small>
              </p>
              <p v-if="d === 'hydrants' && mixedCount">
                <span class="map-color-swatch" style="background: #334155"></span>
                Estados distintos <small>({{ mixedCount }})</small>
              </p>
              <p v-if="!visibleItems.some((i) => i.domain === d)">
                Sin puntos en este encuadre.
              </p>
            </section>
          </div>
        </details>
        <MapPopupCard
          v-if="selected"
          :item="selected"
          :neighbors="neighbors"
          @select="select"
          @close="selectedKey = undefined"
        />
      </div>
    </div>
  </main>
</template>
