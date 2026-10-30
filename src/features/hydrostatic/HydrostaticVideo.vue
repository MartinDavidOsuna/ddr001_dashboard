<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { api, problemMessage } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { date, label } from "./hydrostatic.format";
const props = defineProps<{ testId: string }>();
type Link = {
  id: string;
  sha256: string;
  bytes: string;
  actorId: string;
  associatedAt: string;
  previousId: string | null;
  reason: string;
};
type Video = {
  declaration: string;
  declaredAt: string | null;
  link: Link | null;
  maxBytes: number;
};
type VideoEvent = {
  id: string;
  action: string;
  reason: string;
  actorId: string;
  occurredAt: string;
  sha256: string | null;
};
const auth = useAuthStore(),
  data = ref<Video>(),
  events = ref<VideoEvent[]>([]),
  error = ref(""),
  busy = ref(false),
  file = ref<File>(),
  reason = ref(""),
  confirmed = ref(false),
  source = ref(""),
  page = ref(1),
  operation = ref(crypto.randomUUID());
const base = computed(
  () =>
    `/admin/dashboard/construction/hydrostatic-tests/tests/${props.testId}/video`,
);
let generation = 0;
async function load() {
  const g = ++generation;
  error.value = "";
  try {
    const [v, h] = await Promise.all([
      api.get<Video>(base.value),
      api.get<{ items: VideoEvent[] }>(base.value + "/history", {
        params: { page: page.value },
      }),
    ]);
    if (g === generation) {
      data.value = v.data;
      events.value = h.data.items;
    }
  } catch (e) {
    if (g === generation)
      error.value = problemMessage(e, "No se pudo consultar el video.");
  }
}
watch(
  () => props.testId,
  () => {
    source.value = "";
    data.value = undefined;
    events.value = [];
    file.value = undefined;
    page.value = 1;
    void load();
  },
  { immediate: true },
);
function choose(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0];
  operation.value = crypto.randomUUID();
  confirmed.value = false;
}
async function upload() {
  const f = file.value;
  if (!f || busy.value) return;
  error.value = "";
  if (!/\.mp4$/i.test(f.name) || f.type !== "video/mp4" || f.size > 104857600) {
    error.value = "Selecciona MP4 de hasta 100 MiB.";
    return;
  }
  if (data.value?.link && (!reason.value.trim() || !confirmed.value)) {
    error.value = "Indica el motivo y confirma la sustitución.";
    return;
  }
  busy.value = true;
  const target = base.value,
    g = generation,
    prior = data.value?.link?.id,
    op = operation.value,
    why = reason.value.trim();
  try {
    const digest = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
    const sha = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    await api.post(target + "-link", f, {
      timeout: 120000,
      headers: {
        "Content-Type": "video/mp4",
        "X-Video-Filename": "video.mp4",
        "X-Content-SHA256": sha,
        "Idempotency-Key": op,
        "X-Video-Reason": encodeURIComponent(why),
        ...(prior ? { "X-Previous-Link": prior } : {}),
      },
    });
    if (g !== generation) return;
    source.value = "";
    file.value = undefined;
    reason.value = "";
    confirmed.value = false;
    operation.value = crypto.randomUUID();
    await load();
  } catch (e) {
    error.value = problemMessage(
      e,
      "Carga interrumpida. Puedes reintentar el mismo archivo sin duplicarlo.",
    );
  } finally {
    busy.value = false;
  }
}
async function play() {
  error.value = "";
  const target = base.value,
    g = generation;
  try {
    await api.post(target + "/playback-session", {}, { withCredentials: true });
    if (g === generation)
      source.value = api.getUri({ url: target + "/content" });
  } catch (e) {
    source.value = "";
    error.value = problemMessage(
      e,
      "Archivo no disponible, integridad incorrecta o acceso denegado.",
    );
  }
}
</script>
<template>
  <section class="card">
    <h2>Video de WhatsApp</h2>
    <p
      v-if="error"
      role="alert"
    >
      {{ error }} <button
        class="btn"
        @click="load"
      >
        Reintentar consulta
      </button>
    </p>
    <template v-if="data">
      <p>
        Declaración del operador: {{ label(data.declaration) }} ·
        {{ date(data.declaredAt) }}
      </p>
      <p>
        Estado administrativo:
        {{ data.link ? "Vinculado por administrador" : "Video no recibido" }}.
        La declaración no confirma recepción ni certifica el resultado
        hidráulico.
      </p>
      <template v-if="data.link">
        <p>
          Administrador: {{ data.link.actorId }} · Asociación:
          {{ date(data.link.associatedAt) }}
        </p>
        <p style="overflow-wrap: anywhere">
          SHA-256: {{ data.link.sha256 }} · {{ data.link.bytes }} bytes. La
          reproducción verifica integridad en servidor.
        </p>
        <button
          class="btn"
          @click="play"
        >
          Reproducir / autorizar descarga
        </button>
        <template v-if="source">
          <video
            :key="source + data.link.id"
            :src="source"
            controls
            preload="metadata"
            crossorigin="use-credentials"
            style="width: 100%; max-height: 420px"
            aria-label="Video administrativo del intento"
            @error="
              error =
                'No se pudo reproducir. Reautoriza la reproducción; si el formato no es compatible, usa la descarga autorizada.'
            "
          />
          <a :href="source + '?download=1'">Descargar original autorizado</a>
          <p>
            Si el navegador no admite el códec, descarga el original. La
            autorización expira en diez minutos; pulsa Reproducir para
            renovarla.
          </p>
        </template>
      </template>
      <form
        v-if="auth.user?.role === 'admin'"
        @submit.prevent="upload"
      >
        <p>
          Confirma que el archivo corresponde a este gabinete e intento. MP4,
          1–60 segundos, hasta 100 MiB. Se conserva el original.
        </p>
        <label>Seleccionar video
          <input
            type="file"
            accept="video/mp4,.mp4"
            :disabled="busy"
            @change="choose"
          ></label>
        <template v-if="data.link">
          <label>Motivo de sustitución
            <textarea
              v-model="reason"
              maxlength="500"
              required
              :disabled="busy"
            />
          </label>
          <label><input
            v-model="confirmed"
            type="checkbox"
            required
            :disabled="busy"
          >
            Confirmo la sustitución; el video anterior y su auditoría se
            conservarán.</label>
        </template>
        <button
          class="btn"
          :disabled="busy || !file"
        >
          {{
            busy
              ? "Verificando y cargando…"
              : data.link
                ? "Sustituir video"
                : "Cargar video"
          }}
        </button>
      </form>
      <details>
        <summary>Ver historial administrativo</summary>
        <p v-if="!events.length">
          Sin acciones en esta página.
        </p>
        <ol>
          <li
            v-for="event in events"
            :key="event.id"
          >
            {{ event.action }} · {{ date(event.occurredAt) }} ·
            {{ event.actorId }} · {{ event.reason
            }}<span
              v-if="event.sha256"
              style="overflow-wrap: anywhere"
            >
              · SHA-256 {{ event.sha256 }}</span>
          </li>
        </ol>
        <button
          class="btn"
          :disabled="page === 1"
          @click="
            page--;
            load();
          "
        >
          Anterior
        </button>
        {{ page }}
        <button
          class="btn"
          :disabled="events.length < 25"
          @click="
            page++;
            load();
          "
        >
          Siguiente
        </button>
      </details>
    </template>
  </section>
</template>
