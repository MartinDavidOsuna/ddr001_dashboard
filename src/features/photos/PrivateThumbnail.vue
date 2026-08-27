<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Camera } from "@lucide/vue";
import { dashboardService } from "@/services/dashboard";
import type { GalleryPhoto } from "@/api/types";

const props = defineProps<{
  photo: GalleryPhoto;
  statusLabel: string;
}>();
const root = ref<HTMLElement>();
const url = ref("");
const failed = ref(false);
let observer: IntersectionObserver | undefined;
let active = true;

async function load() {
  observer?.disconnect();
  observer = undefined;
  if (url.value || props.photo.uploadStatus !== "verified") return;
  try {
    const objectUrl = await dashboardService.photo(props.photo.thumbnailUrl);
    if (active) url.value = objectUrl;
    else URL.revokeObjectURL(objectUrl);
  } catch {
    if (active) failed.value = true;
  }
}

onMounted(() => {
  if (props.photo.uploadStatus !== "verified") return;
  if (!("IntersectionObserver" in window)) {
    void load();
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void load();
    },
    { rootMargin: "240px" },
  );
  if (root.value) observer.observe(root.value);
});

onBeforeUnmount(() => {
  active = false;
  observer?.disconnect();
  if (url.value) URL.revokeObjectURL(url.value);
});
</script>

<template>
  <span ref="root" class="private-thumbnail">
    <img
      v-if="url"
      :src="url"
      :alt="photo.slotLabel || photo.slotCode"
      loading="lazy"
    />
    <span v-else>
      <Camera :size="30" />{{
        photo.uploadStatus !== "verified"
          ? statusLabel
          : failed
            ? "Imagen no disponible"
            : "Cargando…"
      }}
    </span>
  </span>
</template>

<style scoped>
.private-thumbnail,
.private-thumbnail > span {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
}
.private-thumbnail > span {
  color: #71829a;
  font-size: 0.78rem;
}
.private-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
</style>
