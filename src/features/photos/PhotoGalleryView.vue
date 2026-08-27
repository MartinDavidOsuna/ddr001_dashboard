<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "@lucide/vue";
import { dashboardService } from "@/services/dashboard";
import { problemMessage } from "@/api/client";
import { toGalleryApiFilters } from "./gallery-filters";
import PrivateThumbnail from "./PrivateThumbnail.vue";
import type {
  GalleryFilterOption,
  GalleryPhoto,
  GalleryStatusOption,
  Page,
  PhotoSlotOption,
} from "@/api/types";

const page = ref<Page<GalleryPhoto>>();
const slots = ref<PhotoSlotOption[]>([]);
const technicians = ref<GalleryFilterOption[]>([]),
  crews = ref<GalleryFilterOption[]>([]),
  statuses = ref<GalleryStatusOption[]>([]);
const loading = ref(true),
  error = ref("");
const selected = ref<GalleryPhoto>(),
  fullUrl = ref(""),
  zoom = ref(1);
const filters = reactive({
  page: 1,
  pageSize: 40,
  search: "",
  slotCode: "",
  category: "",
  technicianId: "",
  crewId: "",
  uploadStatus: "",
  from: "",
  to: "",
});
let timer = 0,
  generation = 0,
  originalGeneration = 0;
const range = computed(() =>
  page.value
    ? `${(page.value.page - 1) * page.value.pageSize + 1}–${Math.min(page.value.page * page.value.pageSize, page.value.total)} de ${page.value.total}`
    : "",
);
async function load() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const response = await dashboardService.gallery(toGalleryApiFilters(filters));
    if (current === generation) page.value = response;
  } catch (cause) {
    if (current === generation)
      error.value = problemMessage(
        cause,
        "No fue posible cargar las fotografías.",
      );
  } finally {
    if (current === generation) loading.value = false;
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
  Object.assign(filters, {
    page: 1,
    pageSize: 40,
    search: "",
    slotCode: "",
    category: "",
    technicianId: "",
    crewId: "",
    uploadStatus: "",
    from: "",
    to: "",
  });
  load();
}
function releaseOriginal() {
  if (fullUrl.value.startsWith("blob:")) URL.revokeObjectURL(fullUrl.value);
  fullUrl.value = "";
}
async function open(photo: GalleryPhoto) {
  const current = ++originalGeneration;
  releaseOriginal();
  selected.value = photo;
  zoom.value = 1;
  if (photo.uploadStatus !== "verified") {
    fullUrl.value = "unavailable";
    return;
  }
  try {
    const url = await dashboardService.photo(photo.contentUrl);
    if (current === originalGeneration) fullUrl.value = url;
    else URL.revokeObjectURL(url);
  } catch {
    if (current === originalGeneration) fullUrl.value = "error";
  }
}
function close() {
  originalGeneration++;
  releaseOriginal();
  selected.value = undefined;
  zoom.value = 1;
}
function move(delta: number) {
  const items = page.value?.items || [];
  const index = items.findIndex((x) => x.photoId === selected.value?.photoId);
  if (index >= 0) open(items[(index + delta + items.length) % items.length]!);
}
function key(event: KeyboardEvent) {
  if (!selected.value) return;
  if (event.key === "Escape") close();
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
}
function date(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Hermosillo",
  }).format(new Date(value));
}
const statusLabels: Record<string, string> = {
  received: "Recibida",
  processing: "Procesando",
  verified: "Verificada",
  rejected: "Rechazada",
  missing: "Faltante",
};
onMounted(async () => {
  window.addEventListener("keydown", key);
  try {
    const options = await dashboardService.galleryFilters();
    slots.value = options.slots;
    technicians.value = options.technicians;
    crews.value = options.crews;
    statuses.value = options.statuses;
  } catch {
    /* gallery still remains usable */
  }
  await load();
});
onBeforeUnmount(() => {
  generation++;
  clearTimeout(timer);
  window.removeEventListener("keydown", key);
  close();
});
</script>

<template>
  <div class="content photo-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Fotografías</h1>
        <p class="page-subtitle">
          Explora las evidencias de todas las revisiones por rubro
        </p>
      </div>
      <span v-if="page" class="muted desktop-only"
        >{{ page.total.toLocaleString() }} imágenes</span
      >
    </div>
    <section class="card filters">
      <div class="search">
        <Search :size="18" /><input
          v-model="filters.search"
          aria-label="Buscar fotografías"
          placeholder="Buscar hidrante, técnico o rubro…"
          @input="search"
        />
      </div>
      <div class="field">
        <label for="slot">Tipo de foto / rubro</label
        ><select id="slot" v-model="filters.slotCode" @change="apply">
          <option value="">Todos los rubros</option>
          <option
            v-for="slot in slots"
            :key="slot.slotCode"
            :value="slot.slotCode"
          >
            {{ slot.label }} ({{ slot.count }})
          </option>
        </select>
      </div>
      <div class="field">
        <label for="category">Categoría</label
        ><select id="category" v-model="filters.category" @change="apply">
          <option value="">Todas</option>
          <option value="mandatory">Obligatorias</option>
          <option value="additional">Adicionales</option>
        </select>
      </div>
      <div class="field">
        <label for="technician">Técnico</label
        ><select id="technician" v-model="filters.technicianId" @change="apply">
          <option value="">Todos</option>
          <option v-for="option in technicians" :key="option.id" :value="option.id">
            {{ option.label }} ({{ option.count }})
          </option>
        </select>
      </div>
      <div class="field">
        <label for="crew">Cuadrilla</label
        ><select id="crew" v-model="filters.crewId" @change="apply">
          <option value="">Todas</option>
          <option v-for="option in crews" :key="option.id" :value="option.id">
            {{ option.label }} ({{ option.count }})
          </option>
        </select>
      </div>
      <div class="field">
        <label for="verification">Verificación</label
        ><select id="verification" v-model="filters.uploadStatus" @change="apply">
          <option value="">Todos los estados</option>
          <option v-for="option in statuses" :key="option.status" :value="option.status">
            {{ statusLabels[option.status] || option.status }} ({{ option.count }})
          </option>
        </select>
      </div>
      <div class="field">
        <label for="from">Desde</label
        ><input id="from" v-model="filters.from" type="date" />
      </div>
      <div class="field">
        <label for="to">Hasta</label
        ><input id="to" v-model="filters.to" type="date" />
      </div>
      <div class="actions">
        <button class="btn" @click="reset">Limpiar</button
        ><button class="btn btn--primary" @click="apply">Aplicar</button>
      </div>
    </section>
    <div v-if="error" class="error-box" role="alert">
      {{ error }} <button class="btn" @click="load">Reintentar</button>
    </div>
    <div v-else-if="loading" class="gallery">
      <div v-for="n in 12" :key="n" class="skeleton tile" />
    </div>
    <div v-else-if="page?.items.length" class="gallery">
      <article
        v-for="photo in page.items"
        :key="photo.photoId"
        class="card photo-card"
      >
        <button
          class="preview"
          :aria-label="`Abrir ${photo.slotLabel || photo.slotCode} del hidrante ${photo.accountNumber}`"
          @click="open(photo)"
        >
          <PrivateThumbnail
            :photo="photo"
            :status-label="statusLabels[photo.uploadStatus] || photo.uploadStatus"
          />
        </button>
        <footer>
          <div class="photo-title">
            <b>{{ photo.slotLabel || photo.slotCode }}</b>
            <span :class="['category-badge', `category-badge--${photo.category}`]">
              {{ photo.category === "mandatory" ? "Obligatoria" : "Adicional" }}
            </span>
          </div
          ><div class="record-links">
            <RouterLink :to="`/hidrantes/${photo.hydrantId}`"
              >Hidrante {{ photo.accountNumber }}</RouterLink
            ><RouterLink :to="`/revisiones/${photo.inspectionId}`"
              >Rev. #{{ photo.revisionNumber }}</RouterLink
            >
          </div>
          <small
            >{{ photo.technicianName
            }}<template v-if="photo.crewName"> · {{ photo.crewName }}</template>
            · {{ date(photo.capturedAt) }}</small
          >
        </footer>
      </article>
    </div>
    <div v-else class="empty-box">
      <Camera :size="34" />
      <h2>Sin fotografías</h2>
      <p class="muted">No hay imágenes que coincidan con estos filtros.</p>
      <button class="btn" @click="reset">Limpiar filtros</button>
    </div>
    <footer v-if="page?.total" class="pagination">
      <span>{{ range }}</span
      ><label
        >Por página
        <select v-model.number="filters.pageSize" @change="apply">
          <option :value="20">20</option>
          <option :value="40">40</option>
          <option :value="80">80</option>
        </select></label
      ><button
        class="btn"
        :disabled="page.page === 1"
        @click="
          filters.page--;
          load();
        "
      >
        Anterior</button
      ><button
        class="btn"
        :disabled="page.page * page.pageSize >= page.total"
        @click="
          filters.page++;
          load();
        "
      >
        Siguiente
      </button>
    </footer>
  </div>
  <div
    v-if="selected"
    class="lightbox"
    role="dialog"
    aria-modal="true"
    :aria-label="selected.slotLabel || selected.slotCode"
  >
    <button class="close" aria-label="Cerrar" @click="close"><X /></button
    ><button class="nav prev" aria-label="Anterior" @click="move(-1)">
      <ChevronLeft />
    </button>
    <div class="full">
      <div v-if="!fullUrl" class="skeleton loader" />
      <p v-else-if="fullUrl === 'error'">
        La imagen original no está disponible.
      </p>
      <p v-else-if="fullUrl === 'unavailable'">
        El original privado sólo está disponible para fotografías verificadas.
      </p>
      <img
        v-else
        :src="fullUrl"
        :alt="selected.slotLabel || selected.slotCode"
        :style="{ transform: `scale(${zoom})` }"
      />
      <footer>
        <div>
          <b>{{ selected.slotLabel || selected.slotCode }}</b
          ><small
            >{{ selected.category === "mandatory" ? "Obligatoria" : "Adicional" }} ·
            Hidrante {{ selected.accountNumber }} ·
            Rev. #{{ selected.revisionNumber }} ·
            {{ date(selected.capturedAt) }}</small
          >
          <small
            >{{ selected.technicianName
            }}<template v-if="selected.crewName"> · {{ selected.crewName }}</template>
            · {{ statusLabels[selected.uploadStatus] || selected.uploadStatus }} ·
            {{ selected.widthPx || "?" }}×{{ selected.heightPx || "?" }} px</small
          >
          <span class="lightbox-links"
            ><RouterLink :to="`/hidrantes/${selected.hydrantId}`" @click="close"
              >Ver hidrante</RouterLink
            ><RouterLink :to="`/revisiones/${selected.inspectionId}`" @click="close"
              >Ver revisión</RouterLink
            ></span
          >
        </div>
        <button
          aria-label="Alejar"
          :disabled="zoom <= 1"
          @click="zoom = Math.max(1, zoom - 0.25)"
        >
          <ZoomOut /></button
        ><button
          aria-label="Acercar"
          :disabled="zoom >= 3"
          @click="zoom = Math.min(3, zoom + 0.25)"
        >
          <ZoomIn />
        </button>
      </footer>
    </div>
    <button class="nav next" aria-label="Siguiente" @click="move(1)">
      <ChevronRight />
    </button>
  </div>
</template>

<style scoped>
.photo-page {
  max-width: 1680px;
}
.filters {
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 10px;
  align-items: end;
  margin-bottom: 18px;
}
.search {
  height: 42px;
  border: 1px solid #ccd6e2;
  border-radius: 7px;
  display: flex;
  align-items: center;
  padding: 0 11px;
  gap: 8px;
}
.search input {
  border: 0;
  outline: 0;
  width: 100%;
  min-width: 0;
}
.actions {
  display: flex;
  gap: 7px;
}
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}
.tile {
  height: 285px;
}
.photo-card {
  overflow: hidden;
  min-width: 0;
}
.preview {
  display: block;
  width: 100%;
  height: 210px;
  padding: 0;
  border: 0;
  background: #e9eef4;
  cursor: zoom-in;
  overflow: hidden;
}
.preview :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.preview:hover :deep(img) {
  transform: scale(1.03);
}
.photo-card footer {
  padding: 12px;
  display: grid;
  gap: 5px;
}
.photo-card footer b {
  font-size: 0.87rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.photo-card footer a {
  color: #175ed5;
  text-decoration: none;
  font-size: 0.8rem;
}
.photo-title {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.photo-title b {
  flex: 1;
}
.category-badge {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 0.67rem;
  font-weight: 650;
}
.category-badge--mandatory {
  color: #1557b0;
  background: #e6f0ff;
}
.category-badge--additional {
  color: #566477;
  background: #edf1f5;
}
.record-links,
.lightbox-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.lightbox-links a {
  color: #9fc3ff;
  text-decoration: none;
  font-size: 0.8rem;
}
.photo-card footer small {
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  font-size: 0.8rem;
}
.pagination label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pagination select {
  height: 36px;
  border: 1px solid #ccd6e2;
  border-radius: 6px;
}
.lightbox {
  position: fixed;
  inset: 0;
  background: #07111deb;
  z-index: 100;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 64px;
  align-items: center;
  color: white;
}
.close {
  position: absolute;
  right: 18px;
  top: 16px;
  z-index: 2;
}
.close,
.nav,
.full footer button {
  border: 0;
  background: #ffffff18;
  color: white;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.nav {
  justify-self: center;
}
.full {
  height: 92vh;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
}
.full > img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.15s;
}
.full > p,
.loader {
  margin: auto;
}
.full footer {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.full footer div {
  display: grid;
  margin-right: auto;
}
.full footer small {
  color: #b7c4d2;
}
.full footer button:disabled {
  opacity: 0.35;
}
.empty-box svg {
  color: #8092aa;
}
@media (max-width: 1150px) {
  .filters {
    grid-template-columns: repeat(3, 1fr);
  }
  .actions {
    align-self: end;
  }
}
@media (max-width: 650px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
  .search {
    grid-column: 1/-1;
  }
  .actions {
    grid-column: 1/-1;
  }
  .gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }
  .preview {
    height: 150px;
  }
  .photo-card footer {
    padding: 9px;
  }
  .pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
  .lightbox {
    grid-template-columns: 48px minmax(0, 1fr) 48px;
  }
  .full {
    height: 85vh;
  }
  .nav {
    width: 38px;
    height: 38px;
  }
}
</style>
