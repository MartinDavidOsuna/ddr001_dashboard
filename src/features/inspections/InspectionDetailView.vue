<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Signal,
  Wifi,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
} from "@lucide/vue";
import AppStatus from "@/components/AppStatus.vue";
import InspectionMap from "@/components/InspectionMap.vue";
import { dashboardService } from "@/services/dashboard";
import { problemMessage } from "@/api/client";
import type { InspectionDetail, Photo } from "@/api/types";
import {
  answerDisplay,
  checklistCounts,
  groupChecklist,
  mandatoryPhotoSlots,
  parseJson,
} from "./inspection-format";
const route = useRoute(),
  data = ref<InspectionDetail>(),
  loading = ref(true),
  error = ref(""),
  tab = ref("summary"),
  openSections = ref(new Set<string>()),
  photoUrls = ref(new Map<string, string>()),
  photoErrors = ref(new Set<string>()),
  lightbox = ref<number | null>(null),
  fullUrl = ref("");
const tabs: [string, string][] = [
  ["summary", "Resumen"],
  ["checklist", "Checklist"],
  ["photos", "Fotografías"],
  ["location", "Ubicación"],
  ["signal", "Señal"],
  ["history", "Historial"],
  ["audit", "Auditoría"],
];
const groups = computed(() => groupChecklist(data.value?.checklistItems || [])),
  counts = computed(() => checklistCounts(data.value?.checklistItems || []));
const mandatoryCards = computed(() =>
  mandatoryPhotoSlots.map(([slot, label]) => ({
    slot,
    label,
    photo: data.value?.photos.find(
      (photo) => photo.isMandatory && photo.slotCode === slot,
    ),
  })),
);
const additionalCards = computed(() =>
  (data.value?.photos.filter((photo) => !photo.isMandatory) || []).map(
    (photo) => ({
      slot: photo.slotCode + ":" + photo.photoId,
      label: photo.slotLabel || "Fotografía adicional",
      photo,
    }),
  ),
);
const photoCards = computed(() => [
  ...mandatoryCards.value,
  ...additionalCards.value,
]);
function formatDate(v?: string) {
  return v
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Hermosillo",
      }).format(new Date(v))
    : "No disponible";
}
function toggle(id: string) {
  const next = new Set(openSections.value);
  next.has(id) ? next.delete(id) : next.add(id);
  openSections.value = next;
}
async function loadPhoto(p: Photo) {
  if (photoUrls.value.has(p.photoId) || photoErrors.value.has(p.photoId))
    return;
  try {
    photoUrls.value.set(
      p.photoId,
      await dashboardService.photo(p.thumbnailUrl),
    );
  } catch {
    photoErrors.value.add(p.photoId);
  }
}
async function openPhoto(index: number) {
  const p = photoCards.value[index]?.photo;
  if (!p) return;
  lightbox.value = index;
  fullUrl.value = "";
  try {
    fullUrl.value = await dashboardService.photo(p.contentUrl);
  } catch {
    fullUrl.value = "error";
  }
}
function move(delta: number) {
  if (lightbox.value === null) return;
  const next =
    (lightbox.value + delta + photoCards.value.length) %
    photoCards.value.length;
  openPhoto(next);
}
function close() {
  if (fullUrl.value && fullUrl.value !== "error")
    URL.revokeObjectURL(fullUrl.value);
  fullUrl.value = "";
  lightbox.value = null;
}
function key(e: KeyboardEvent) {
  if (lightbox.value === null) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowLeft") move(-1);
  if (e.key === "ArrowRight") move(1);
}
onMounted(async () => {
  window.addEventListener("keydown", key);
  try {
    data.value = await dashboardService.inspection(String(route.params.id));
    if (groups.value[0]) openSections.value.add(groups.value[0].id);
    for (const p of data.value.photos) loadPhoto(p);
  } catch (e) {
    error.value = problemMessage(e, "No fue posible cargar la revisión.");
  } finally {
    loading.value = false;
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", key);
  for (const u of photoUrls.value.values()) URL.revokeObjectURL(u);
  close();
});
</script>
<template>
  <div class="detail">
    <div v-if="loading" class="content">
      <div class="skeleton detail-loading" />
    </div>
    <div v-else-if="error" class="content">
      <div class="error-box" role="alert">
        {{ error }}<br /><RouterLink class="btn" to="/revisiones"
          >Volver</RouterLink
        >
      </div>
    </div>
    <template v-else-if="data"
      ><section class="detail-head">
        <div class="identity">
          <RouterLink to="/revisiones" aria-label="Volver a revisiones"
            ><ArrowLeft
          /></RouterLink>
          <div>
            <h1>
              Hidrante <span class="mono">{{ data.accountNumber }}</span>
              <AppStatus :status="data.status" />
              <em>Rev. #{{ data.revisionNumber }}</em>
            </h1>
            <p>
              {{ formatDate(data.startedAt) }} · Técnico:
              {{ data.technicianName }} · Cuadrilla:
              {{ data.crewName || "Sin cuadrilla" }}
            </p>
          </div>
        </div>
        <div class="completion">
          <span
            ><CheckCircle2 />Checklist:
            <b>{{ counts.captured }}/{{ counts.total }}</b></span
          ><span
            ><Camera />Fotografías:
            <b
              >{{ data.mandatoryPhotosCompleted }}/{{
                data.mandatoryPhotosRequired
              }}
              obligatorias · {{ data.totalPhotos }} total</b
            ></span
          ><span
            ><MapPin />GPS:
            <b>{{ data.location ? "Disponible" : "Sin captura" }}</b></span
          ><span
            ><Signal />Señal:
            <b
              >{{ data.signal?.generation || "Sin captura"
              }}<template v-if="data.signal?.dbm != null">
                · {{ data.signal.dbm }} dBm</template
              ></b
            ></span
          >
        </div>
        <nav class="tabs" aria-label="Secciones del detalle">
          <button
            v-for="[key, label] in tabs"
            :key="key"
            :class="{ active: tab === key }"
            @click="tab = key"
          >
            {{ label }}
          </button>
        </nav>
      </section>
      <main class="detail-body">
        <section v-if="tab === 'summary'" class="summary-grid">
          <article class="card info">
            <h2>Datos del hidrante</h2>
            <dl>
              <div>
                <dt>Cuenta</dt>
                <dd class="mono">{{ data.accountNumber }}</dd>
              </div>
              <div>
                <dt>Año de instalación</dt>
                <dd>{{ data.installationYear || "No disponible" }}</dd>
              </div>
              <div>
                <dt>Gasto nominal</dt>
                <dd>
                  {{
                    data.flowLps != null
                      ? `${data.flowLps} L/s`
                      : "No disponible"
                  }}
                </dd>
              </div>
              <div>
                <dt>Origen</dt>
                <dd>{{ data.sourceType }}</dd>
              </div>
            </dl>
          </article>
          <article class="card info">
            <h2>Revisión</h2>
            <dl>
              <div>
                <dt>Número</dt>
                <dd>#{{ data.revisionNumber }}</dd>
              </div>
              <div>
                <dt>Técnico</dt>
                <dd>{{ data.technicianName }}</dd>
              </div>
              <div>
                <dt>Cuadrilla</dt>
                <dd>{{ data.crewName || "No disponible" }}</dd>
              </div>
              <div>
                <dt>Dispositivo</dt>
                <dd>
                  {{
                    [data.manufacturer, data.model].filter(Boolean).join(" ") ||
                    "No disponible"
                  }}
                </dd>
              </div>
              <div>
                <dt>Checklist</dt>
                <dd>{{ data.checklistTitle }} v{{ data.checklistVersion }}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd><AppStatus :status="data.status" /></dd>
              </div>
            </dl>
            <div v-if="data.generalComments" class="comments">
              <small>Comentarios generales</small>
              <p>{{ data.generalComments }}</p>
            </div>
          </article>
          <article class="card info location-summary">
            <h2>Ubicación capturada</h2>
            <template v-if="data.location"
              ><strong class="mono"
                >{{ data.location.latitude }},
                {{ data.location.longitude }}</strong
              >
              <p>
                Precisión:
                {{
                  data.location.horizontalAccuracyM != null
                    ? `${data.location.horizontalAccuracyM} m`
                    : "No disponible"
                }}
              </p>
              <button class="btn" @click="tab = 'location'">
                Ver mapa
              </button></template
            >
            <p v-else class="muted">No existe una muestra de ubicación.</p>
          </article>
          <article
            v-if="data.reviewComment || data.cancellationReason"
            class="card info"
          >
            <h2>Observaciones de estado</h2>
            <p>{{ data.reviewComment || data.cancellationReason }}</p>
          </article>
        </section>
        <section v-if="tab === 'checklist'" class="checklist">
          <article v-for="g in groups" :key="g.id" class="card section">
            <button
              :aria-expanded="openSections.has(g.id)"
              @click="toggle(g.id)"
            >
              <span
                ><b>{{ g.title }}</b
                ><small>{{ g.items.length }} campos</small></span
              ><ChevronUp v-if="openSections.has(g.id)" /><ChevronDown v-else />
            </button>
            <div v-if="openSections.has(g.id)" class="answers">
              <div
                v-for="item in g.items"
                :key="item.itemId"
                :class="{ missing: answerDisplay(item) === 'No capturado' }"
              >
                <span
                  >{{ item.label
                  }}<small v-if="item.helpText">{{
                    item.helpText
                  }}</small></span
                ><strong>{{ answerDisplay(item) }}</strong>
              </div>
            </div>
          </article>
        </section>
        <section v-if="tab === 'photos'" class="photo-sections">
          <div>
            <h2>Evidencias obligatorias</h2>
            <p class="muted">
              {{ data.mandatoryPhotosCompleted }}/{{
                data.mandatoryPhotosRequired
              }}
              slots cubiertos
            </p>
            <div class="gallery">
              <article
                v-for="(x, index) in mandatoryCards"
                :key="x.slot"
                class="card photo-card"
              >
                <button v-if="x.photo" @click="openPhoto(index)">
                  <img
                    v-if="photoUrls.get(x.photo.photoId)"
                    :src="photoUrls.get(x.photo.photoId)"
                    :alt="x.label"
                  /><span
                    v-else-if="photoErrors.has(x.photo.photoId)"
                    class="image-error"
                    >Imagen no disponible</span
                  ><span v-else class="skeleton image-loading"></span
                  ><ZoomIn class="zoom" />
                </button>
                <div v-else class="photo-missing">
                  <Camera /><span>Fotografía obligatoria no registrada</span>
                </div>
                <footer>
                  <b>{{ x.label }}</b
                  ><small class="mono">{{ x.slot }}</small
                  ><template v-if="x.photo"
                    ><small
                      >{{ x.photo.widthPx || "—" }} ×
                      {{ x.photo.heightPx || "—" }} px</small
                    ><span
                      :class="
                        x.photo.uploadStatus === 'verified'
                          ? 'verified'
                          : 'not-verified'
                      "
                      >● {{ x.photo.uploadStatus }}</span
                    ></template
                  >
                </footer>
              </article>
            </div>
          </div>
          <div v-if="additionalCards.length">
            <h2>Fotografías adicionales ({{ additionalCards.length }})</h2>
            <div class="gallery">
              <article
                v-for="(x, offset) in additionalCards"
                :key="x.slot"
                class="card photo-card"
              >
                <button
                  v-if="x.photo"
                  @click="openPhoto(mandatoryCards.length + offset)"
                >
                  <img
                    v-if="photoUrls.get(x.photo.photoId)"
                    :src="photoUrls.get(x.photo.photoId)"
                    :alt="x.label"
                  /><span
                    v-else-if="photoErrors.has(x.photo.photoId)"
                    class="image-error"
                    >Imagen no disponible</span
                  ><span v-else class="skeleton image-loading"></span
                  ><ZoomIn class="zoom" />
                </button>
                <footer>
                  <b>{{ x.label }}</b
                  ><small class="mono">{{ x.photo?.slotCode }}</small
                  ><small
                    >{{ x.photo?.widthPx || "—" }} ×
                    {{ x.photo?.heightPx || "—" }} px</small
                  >
                </footer>
              </article>
            </div>
          </div>
        </section>
        <section v-if="tab === 'location'" class="location-grid">
          <article class="card map-card">
            <InspectionMap
              :captured="data.location"
              :master="
                data.masterLatitude != null && data.masterLongitude != null
                  ? {
                      latitude: data.masterLatitude,
                      longitude: data.masterLongitude,
                    }
                  : undefined
              "
            />
          </article>
          <article class="card info">
            <h2>Coordenada capturada</h2>
            <dl v-if="data.location">
              <div>
                <dt>Latitud</dt>
                <dd class="mono">{{ data.location.latitude }}</dd>
              </div>
              <div>
                <dt>Longitud</dt>
                <dd class="mono">{{ data.location.longitude }}</dd>
              </div>
              <div>
                <dt>Precisión horizontal</dt>
                <dd>{{ data.location.horizontalAccuracyM ?? "—" }} m</dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>{{ data.location.source }}</dd>
              </div>
              <div>
                <dt>Capturada</dt>
                <dd>{{ formatDate(data.location.capturedAt) }}</dd>
              </div>
            </dl>
            <p v-else class="muted">No disponible</p>
          </article>
          <article class="card info">
            <h2>Coordenada maestra</h2>
            <dl
              v-if="data.masterLatitude != null && data.masterLongitude != null"
            >
              <div>
                <dt>Latitud</dt>
                <dd class="mono">{{ data.masterLatitude }}</dd>
              </div>
              <div>
                <dt>Longitud</dt>
                <dd class="mono">{{ data.masterLongitude }}</dd>
              </div>
              <div>
                <dt>CRS de origen</dt>
                <dd>{{ data.sourceCrs || "No disponible" }}</dd>
              </div>
            </dl>
            <p v-else class="muted">No disponible</p>
          </article>
        </section>
        <section v-if="tab === 'signal'" class="signal-view">
          <article class="card signal-hero">
            <Wifi />
            <div>
              <small>GENERACIÓN</small
              ><strong>{{ data.signal?.generation || "Sin captura" }}</strong>
            </div>
            <div>
              <small>POTENCIA REPORTADA</small
              ><strong>{{
                data.signal?.dbm != null
                  ? `${data.signal.dbm} dBm`
                  : "No disponible"
              }}</strong>
            </div>
          </article>
          <article class="card info">
            <h2>Datos almacenados</h2>
            <dl v-if="data.signal">
              <div>
                <dt>Tecnología</dt>
                <dd>{{ data.signal.networkType || "No disponible" }}</dd>
              </div>
              <div>
                <dt>Operador</dt>
                <dd>{{ data.signal.carrierName || "No disponible" }}</dd>
              </div>
              <div>
                <dt>Nivel del sistema</dt>
                <dd>{{ data.signal.level ?? "No disponible" }}</dd>
              </div>
              <div>
                <dt>Conectada</dt>
                <dd>{{ data.signal.isConnected ? "Sí" : "No" }}</dd>
              </div>
              <div>
                <dt>Roaming</dt>
                <dd>
                  {{
                    data.signal.isRoaming == null
                      ? "No disponible"
                      : data.signal.isRoaming
                        ? "Sí"
                        : "No"
                  }}
                </dd>
              </div>
              <div>
                <dt>Capturada</dt>
                <dd>{{ formatDate(data.signal.capturedAt) }}</dd>
              </div>
            </dl>
            <p v-else class="muted">No existe una muestra de señal.</p>
            <details v-if="data.signal?.rawJson">
              <summary>Datos técnicos</summary>
              <pre>{{
                JSON.stringify(parseJson(data.signal.rawJson), null, 2)
              }}</pre>
            </details>
          </article>
          <p class="note">
            No se clasifica la señal como buena o mala: el proyecto no define
            umbrales vigentes.
          </p>
        </section>
        <section v-if="tab === 'history'" class="timeline">
          <article v-for="x in data.history" :key="x.statusHistoryId">
            <i></i>
            <div class="card">
              <time>{{ formatDate(x.occurredAt) }}</time>
              <h3>{{ x.previousStatus || "Inicio" }} → {{ x.newStatus }}</h3>
              <p>
                {{ x.actorName || x.actorType
                }}<template v-if="x.comment"> · {{ x.comment }}</template>
              </p>
            </div>
          </article>
          <div v-if="!data.history.length" class="empty-box">
            No hay historial de estados registrado.
          </div>
        </section>
        <section v-if="tab === 'audit'" class="audit">
          <article v-for="x in data.audit" :key="x.auditId" class="card">
            <header>
              <div>
                <b>{{ x.action }}</b
                ><small
                  >{{ x.actorName || x.actorType }} ·
                  {{ formatDate(x.occurredAt) }}</small
                >
              </div>
              <span class="mono">{{ x.entityType }}</span>
            </header>
            <details v-if="x.beforeJson">
              <summary>Antes</summary>
              <pre>{{ JSON.stringify(parseJson(x.beforeJson), null, 2) }}</pre>
            </details>
            <details v-if="x.afterJson">
              <summary>Después</summary>
              <pre>{{ JSON.stringify(parseJson(x.afterJson), null, 2) }}</pre>
            </details>
          </article>
          <div v-if="!data.audit.length" class="empty-box">
            No hay eventos de auditoría relacionados.
          </div>
        </section>
      </main>
      <div
        v-if="lightbox !== null"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Visor de fotografía"
      >
        <button class="close" aria-label="Cerrar" @click="close"><X /></button
        ><button
          class="previous"
          aria-label="Fotografía anterior"
          @click="move(-1)"
        >
          <ChevronLeft />
        </button>
        <div>
          <img
            v-if="fullUrl && fullUrl !== 'error'"
            :src="fullUrl"
            :alt="photoCards[lightbox]?.label"
          /><span v-else-if="fullUrl === 'error'">Imagen no disponible</span
          ><span v-else class="skeleton lightbox-loading"></span>
          <footer>
            <b>{{ photoCards[lightbox]?.label }}</b
            ><small
              >{{ photoCards[lightbox]?.photo?.widthPx || "—" }} ×
              {{ photoCards[lightbox]?.photo?.heightPx || "—" }} px ·
              {{ formatDate(photoCards[lightbox]?.photo?.capturedAt) }}</small
            >
          </footer>
        </div>
        <button class="next" aria-label="Fotografía siguiente" @click="move(1)">
          <ChevronRight />
        </button></div
    ></template>
  </div>
</template>
<style scoped>
.detail-head {
  background: #fff;
  border-bottom: 1px solid var(--line);
  padding: 18px 24px 0;
  position: sticky;
  top: 64px;
  z-index: 10;
}
.identity {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.identity > a {
  color: #4c607a;
  padding: 6px;
}
.identity h1 {
  font-size: 1.2rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}
.identity h1 em {
  font-style: normal;
  font:
    600 0.85rem ui-monospace,
    monospace;
  color: #1c5cc1;
  background: #eef5ff;
  border: 1px solid #cbdcf5;
  padding: 4px 9px;
  border-radius: 5px;
}
.identity p {
  color: #6b7e96;
  font-size: 0.8rem;
  margin: 5px 0;
}
.completion {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  background: #f8fafc;
  padding: 10px 12px;
  margin-top: 15px;
  border-radius: 6px;
}
.completion span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: #62748b;
}
.completion svg {
  width: 15px;
  color: #0a9b4c;
}
.completion b {
  color: #16663d;
}
.tabs {
  display: flex;
  gap: 3px;
  margin-top: 8px;
  overflow: auto;
}
.tabs button {
  padding: 12px 15px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  cursor: pointer;
  color: #314156;
  white-space: nowrap;
}
.tabs button.active {
  color: #0e59db;
  border-color: #1965ec;
  font-weight: 650;
}
.detail-body {
  padding: 20px 24px;
  max-width: 1650px;
  margin: auto;
}
.summary-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}
.summary-grid .info:nth-child(2) {
  grid-row: span 2;
}
.info {
  padding: 18px;
}
.info h2 {
  font-size: 0.9rem;
  margin: 0 0 17px;
}
.info dl {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 17px 30px;
}
.info dl div {
  display: grid;
  gap: 4px;
}
.info dt {
  font-size: 0.72rem;
  color: #8493a7;
}
.info dd {
  margin: 0;
  font-size: 0.86rem;
}
.comments {
  border-top: 1px solid #e8edf3;
  margin-top: 20px;
  padding-top: 14px;
}
.comments small {
  color: #8594a8;
}
.comments p {
  margin: 5px 0;
}
.checklist {
  max-width: 920px;
  display: grid;
  gap: 10px;
}
.section > button {
  width: 100%;
  border: 0;
  background: #fff;
  padding: 15px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: #26374d;
}
.section > button span {
  display: flex;
  gap: 8px;
  align-items: center;
}
.section > button small {
  color: #8795a8;
}
.answers {
  padding: 0 18px 12px;
}
.answers > div {
  display: grid;
  grid-template-columns: 1fr minmax(150px, 40%);
  gap: 20px;
  padding: 12px 0;
  border-top: 1px solid #edf1f4;
  font-size: 0.83rem;
}
.answers > div > span {
  display: grid;
}
.answers small {
  color: #8a98aa;
  margin-top: 4px;
}
.answers strong {
  text-align: right;
  font-family: ui-monospace, monospace;
}
.answers .missing strong {
  color: #9a6d0d;
}
.photo-sections {
  display: grid;
  gap: 28px;
}
.photo-sections h2 {
  margin: 0 0 4px;
  font-size: 1rem;
}
.photo-sections > div > .muted {
  margin: 0 0 12px;
}
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: 14px;
}
.photo-card {
  overflow: hidden;
}
.photo-card > button,
.photo-missing {
  height: 220px;
  width: 100%;
  border: 0;
  padding: 0;
  background: #e9eef4;
  display: grid;
  place-items: center;
  position: relative;
  cursor: pointer;
}
.photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.zoom {
  position: absolute;
  right: 10px;
  bottom: 10px;
  color: white;
  background: #10253dbb;
  border-radius: 6px;
  padding: 6px;
  width: 32px;
  height: 32px;
}
.image-loading {
  width: 100%;
  height: 100%;
}
.image-error,
.photo-missing {
  color: #778aa1;
  font-size: 0.8rem;
}
.photo-missing {
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.photo-card footer {
  padding: 12px;
  display: grid;
  gap: 4px;
}
.photo-card footer b {
  font-size: 0.82rem;
}
.photo-card footer small {
  color: #788aa0;
  font-size: 0.69rem;
}
.verified {
  color: #0b8d45;
  font-size: 0.72rem;
}
.not-verified {
  color: #b07100;
  font-size: 0.72rem;
}
.location-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}
.map-card {
  padding: 10px;
  grid-row: span 2;
}
.signal-view {
  max-width: 900px;
  display: grid;
  gap: 14px;
}
.signal-hero {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  align-items: center;
  padding: 25px;
  gap: 25px;
}
.signal-hero > svg {
  color: #1262eb;
  width: 42px;
  height: 42px;
}
.signal-hero div {
  display: grid;
}
.signal-hero small {
  color: #778aa1;
}
.signal-hero strong {
  font:
    700 1.35rem ui-monospace,
    monospace;
}
.note {
  font-size: 0.78rem;
  color: #6d7e94;
}
.info pre,
.audit pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f6f8fb;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.72rem;
  max-height: 340px;
  overflow: auto;
}
.timeline {
  max-width: 850px;
  padding-left: 14px;
}
.timeline article {
  position: relative;
  border-left: 2px solid #cbd8e7;
  padding: 0 0 18px 22px;
}
.timeline article > i {
  position: absolute;
  left: -7px;
  top: 15px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1765ed;
  border: 3px solid #dce8ff;
}
.timeline article > div {
  padding: 15px;
}
.timeline time {
  font-size: 0.7rem;
  color: #72849b;
}
.timeline h3 {
  margin: 5px 0;
  font-size: 0.9rem;
}
.timeline p {
  margin: 0;
  color: #687a91;
  font-size: 0.8rem;
}
.audit {
  display: grid;
  gap: 10px;
  max-width: 1000px;
}
.audit article {
  padding: 15px;
}
.audit header {
  display: flex;
  justify-content: space-between;
}
.audit header div {
  display: grid;
}
.audit header small {
  color: #778aa1;
  font-size: 0.72rem;
  margin-top: 3px;
}
.audit summary,
.signal-view summary {
  cursor: pointer;
  color: #1a5fc9;
  padding: 10px 0;
}
.lightbox {
  position: fixed;
  inset: 0;
  background: #07111dea;
  z-index: 100;
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) 70px;
  align-items: center;
  color: white;
  padding: 35px;
}
.lightbox > div {
  max-width: 1200px;
  max-height: 90vh;
  margin: auto;
  display: grid;
}
.lightbox img {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
}
.lightbox footer {
  display: grid;
  padding: 12px;
  background: #0e1b2b;
}
.lightbox footer small {
  color: #9eafc3;
}
.lightbox button {
  border: 0;
  background: #fff1;
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.lightbox .close {
  position: absolute;
  right: 22px;
  top: 20px;
}
.lightbox-loading {
  width: min(70vw, 800px);
  height: 60vh;
}
.detail-loading {
  height: 70vh;
}
.identity :deep(.status) {
  font-size: 0.72rem;
}
@media (max-width: 850px) {
  .detail-head {
    padding: 14px 14px 0;
  }
  .detail-body {
    padding: 14px;
  }
  .summary-grid,
  .location-grid {
    grid-template-columns: 1fr;
  }
  .summary-grid .info:nth-child(2) {
    grid-row: auto;
  }
  .map-card {
    grid-row: auto;
  }
  .completion {
    gap: 10px;
  }
  .tabs button {
    padding: 11px;
  }
  .gallery {
    grid-template-columns: repeat(2, 1fr);
  }
  .photo-card > button,
  .photo-missing {
    height: 180px;
  }
}
@media (max-width: 520px) {
  .detail-head {
    position: static;
  }
  .identity p {
    line-height: 1.6;
  }
  .completion {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .tabs {
    margin-left: -14px;
    margin-right: -14px;
    padding: 0 8px;
  }
  .info dl {
    grid-template-columns: 1fr;
  }
  .answers > div {
    grid-template-columns: 1fr;
    gap: 7px;
  }
  .answers strong {
    text-align: left;
  }
  .gallery {
    grid-template-columns: 1fr;
  }
  .photo-card > button,
  .photo-missing {
    height: 250px;
  }
  .signal-hero {
    grid-template-columns: auto 1fr;
  }
  .signal-hero div:last-child {
    grid-column: 2;
  }
  .lightbox {
    grid-template-columns: 45px minmax(0, 1fr) 45px;
    padding: 15px 4px;
  }
  .lightbox button {
    width: 40px;
    height: 40px;
  }
}
</style>
