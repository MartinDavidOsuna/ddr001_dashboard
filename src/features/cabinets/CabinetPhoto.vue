<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import ImageViewer from '@/components/ImageViewer.vue';
import type { CabinetAdminPhoto } from "./cabinets.generated";
import { useCabinetBlob } from "./cabinets.blob";
import { date, label, text } from "./cabinets.format";
const props = defineProps<{
  photo: CabinetAdminPhoto;
  relations: Array<{
    subject: string;
    name: string;
    href: string;
    confirmed: boolean;
  }>;
}>();
const thumb = useCabinetBlob(),
  original = useCabinetBlob(),
  root = ref<HTMLElement>(),
  opened = ref(false);
let observer: IntersectionObserver | undefined,
  visible = false;
function thumbnail() {
  if (!thumb.src.value && !thumb.loading.value)
    void thumb.load(props.photo.thumbnailUrl);
}
function close() {
  original.clear();
  opened.value = false;
}
function open() {
  opened.value = true;
  void original.load(props.photo.contentUrl);
}
watch(
  () => props.photo.photoId,
  () => {
    thumb.clear();
    close();
    if (visible) thumbnail();
  },
);
onMounted(() => {
  if (!("IntersectionObserver" in window)) {
    visible = true;
    thumbnail();
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible = true;
        thumbnail();
        observer?.disconnect();
      }
    },
    { rootMargin: "200px" },
  );
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  close();
});
</script>
<template>
  <article
    :id="`photo-${photo.photoId}`"
    ref="root"
    class="cabinet-photo-card"
  >
    <button
      class="cabinet-photo-button"
      :aria-label="`Abrir fotografía ${photo.photoId}`"
      @click="open"
    >
      <img
        v-if="thumb.src.value"
        :src="thumb.src.value"
        :alt="`Fotografía de ${label(photo.context)}`"
        loading="lazy"
        @error="thumb.fail()"
      ><span v-else>{{
        thumb.loading.value ? "Cargando miniatura…" : "Miniatura no disponible"
      }}</span>
    </button>
    <p
      v-if="thumb.error.value"
      role="alert"
    >
      {{ thumb.error.value }}
      <button
        class="btn"
        @click="thumbnail"
      >
        Reintentar miniatura
      </button>
    </p>
    <p>
      <strong>{{ label(photo.context) }}</strong> ·
      {{ label(photo.integrity.status) }}<br>Verificación en vivo:
      {{ date(photo.integrity.checkedAt) }}
    </p>
    <p>
      Original presente: {{ photo.integrity.originalPresent ? "Sí" : "No" }} ·
      Miniatura presente: {{ photo.integrity.thumbnailPresent ? "Sí" : "No"
      }}<br>Captura: {{ date(photo.capturedAt) }}<br>Recepción:
      {{ date(photo.receivedAt) }}<br>Actor:
      {{ photo.actor.name || photo.actor.id }}
    </p>
    <details>
      <summary>GPS de fotografía</summary>
      <p>
        {{ text(photo.metadata.latitude) }},
        {{ text(photo.metadata.longitude) }} · precisión
        {{ text(photo.metadata.accuracy) }} m<br>{{
          date(photo.metadata.capturedAt)
        }}
      </p>
    </details>
    <div class="cabinet-actions">
      <a
        v-for="r in relations"
        :key="r.subject"
        class="cabinet-badge"
        :href="r.href"
      >{{ r.name }} ·
        {{
          r.confirmed
            ? "Relación histórica confirmada"
            : "Relación histórica sin confirmar"
        }}</a>
    </div>
    <ImageViewer :open="opened" :src="original.src.value" :alt="`Fotografía ${photo.photoId}`" :photo-key="photo.photoId" @close="close" @error="original.fail()">
      <template #status>
      <p
        v-if="original.loading.value"
        role="status"
      >
        Cargando fotografía original…
      </p>
      <div
        v-else-if="original.error.value"
        role="alert"
        class="cabinet-error"
      >
        {{ original.error.value }}
        <button
          class="btn"
          @click="original.load(photo.contentUrl)"
        >
          Reintentar original
        </button>
      </div>
      </template>
      <strong>{{ label(photo.context) }}</strong> · {{ label(photo.integrity.status) }}<small>Captura: {{ date(photo.capturedAt) }} · Actor: {{ photo.actor.name || photo.actor.id }} · Verificación: {{ date(photo.integrity.checkedAt) }}</small>
      <a v-for="r in relations" :key="r.subject" :href="r.href">{{ r.name }}</a>
    </ImageViewer>
  </article>
</template>
<style scoped>
.cabinet-photo-button {
  width: 100%;
  min-height: 170px;
  padding: 0;
  background: #f3f6fa;
  border: 0;
  cursor: pointer;
  color: var(--muted);
}
</style>
