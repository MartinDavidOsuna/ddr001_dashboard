<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { clampPan, clampZoom, fitImage, maxZoom } from './image-viewer.geometry';
const props = withDefaults(defineProps<{ open: boolean; src?: string; alt?: string; photoKey?: string | number; navigation?: boolean }>(), { src: '', alt: 'Fotografía', photoKey: '', navigation: false });
const emit = defineEmits<{ close: []; previous: []; next: []; error: [] }>();
const dialog = ref<HTMLDialogElement>(), stage = ref<HTMLElement>();
const zoom = ref(1), x = ref(0), y = ref(0), naturalWidth = ref(0), naturalHeight = ref(0), vw = ref(0), vh = ref(0);
const fitted = computed(() => fitImage(naturalWidth.value, naturalHeight.value, vw.value, vh.value));
const imageStyle = computed(() => ({ width: `${fitted.value.width}px`, height: `${fitted.value.height}px`, transform: `translate(${x.value}px, ${y.value}px) scale(${zoom.value})` }));
const pointers = new Map<number, { x: number; y: number }>();
let observer: ResizeObserver | undefined, previousFocus: HTMLElement | null = null, disposed = false;
function reset() { zoom.value = 1; x.value = 0; y.value = 0; pointers.clear(); }
function bound() {
  const pan = clampPan(x.value, y.value, zoom.value, fitted.value.width, fitted.value.height, vw.value, vh.value);
  x.value = pan.x; y.value = pan.y;
}
function measure() {
  vw.value = stage.value?.clientWidth || 0; vh.value = stage.value?.clientHeight || 0;
  reset();
}
function loaded(event: Event) {
  const image = event.target as HTMLImageElement;
  naturalWidth.value = image.naturalWidth; naturalHeight.value = image.naturalHeight;
  measure();
}
function scale(value: number, focalX = 0, focalY = 0) {
  const next = clampZoom(value), ratio = next / zoom.value;
  x.value = focalX - (focalX - x.value) * ratio;
  y.value = focalY - (focalY - y.value) * ratio;
  zoom.value = next; bound();
}
function focal(clientX: number, clientY: number) {
  const rect = stage.value!.getBoundingClientRect();
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
}
function wheel(event: WheelEvent) {
  const point = focal(event.clientX, event.clientY);
  scale(zoom.value * (event.deltaY < 0 ? 1.15 : 1 / 1.15), point.x, point.y);
}
function down(event: PointerEvent) {
  if (event.button !== 0) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  // Synthetic events (tests/accessibility tooling) do not have an active native pointer.
  if (event.isTrusted) stage.value?.setPointerCapture?.(event.pointerId);
}
function move(event: PointerEvent) {
  const old = pointers.get(event.pointerId); if (!old) return;
  const before = [...pointers.values()];
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const after = [...pointers.values()];
  if (before.length === 2) {
    const a = before[0]!, b = before[1]!, c = after[0]!, d = after[1]!;
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const center = focal((a.x + b.x) / 2, (a.y + b.y) / 2);
    if (distance > 0) scale(zoom.value * Math.hypot(c.x - d.x, c.y - d.y) / distance, center.x, center.y);
    x.value += (c.x + d.x - a.x - b.x) / 2;
    y.value += (c.y + d.y - a.y - b.y) / 2;
  } else if (zoom.value > 1) {
    x.value += event.clientX - old.x; y.value += event.clientY - old.y;
  }
  bound();
}
function up(event: PointerEvent) { pointers.delete(event.pointerId); }
function key(event: KeyboardEvent) {
  if (!props.open || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (['+', '=', '-', 'Escape', 'ArrowLeft', 'ArrowRight'].includes(event.key) || ['NumpadAdd', 'NumpadSubtract'].includes(event.code)) event.preventDefault();
  if (event.key === 'Escape') emit('close');
  else if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') scale(zoom.value + .25);
  else if (event.key === '-' || event.code === 'NumpadSubtract') scale(zoom.value - .25);
  else if (props.navigation && event.key === 'ArrowLeft') emit('previous');
  else if (props.navigation && event.key === 'ArrowRight') emit('next');
}
function cleanup() {
  window.removeEventListener('keydown', key); window.removeEventListener('resize', measure);
  observer?.disconnect(); observer = undefined; reset();
}
watch(() => props.open, async (open) => {
  if (!open) { cleanup(); dialog.value?.close(); previousFocus?.focus(); return; }
  previousFocus = document.activeElement as HTMLElement;
  await nextTick(); if (!props.open || disposed) return;
  dialog.value?.showModal(); reset(); measure();
  window.addEventListener('keydown', key); window.addEventListener('resize', measure);
  if (typeof ResizeObserver !== 'undefined' && stage.value) { observer = new ResizeObserver(measure); observer.observe(stage.value); }
}, { immediate: true });
watch(() => [props.photoKey, props.src], () => { reset(); naturalWidth.value = 0; naturalHeight.value = 0; });
onBeforeUnmount(() => { disposed = true; cleanup(); dialog.value?.close(); previousFocus?.focus(); });
</script>
<template>
  <dialog
    ref="dialog"
    class="image-viewer lightbox"
    :aria-label="alt"
    @cancel.prevent="emit('close')"
    @close="props.open && !dialog?.open && emit('close')"
  >
    <button
      class="viewer-close"
      aria-label="Cerrar"
      title="Cerrar fotografía"
      autofocus
      @click="emit('close')"
    >
      Cerrar fotografía ×
    </button>
    <div class="viewer-controls">
      <button
        v-if="navigation"
        aria-label="Anterior"
        title="Fotografía anterior"
        @click="emit('previous')"
      >
        ‹
      </button>
      <button
        aria-label="Alejar"
        title="Alejar fotografía"
        :disabled="zoom <= 1"
        @click="scale(zoom - .25)"
      >
        −
      </button>
      <button
        aria-label="Ajustar a pantalla"
        title="Ajustar a pantalla"
        @click="reset"
      >
        Ajustar
      </button>
      <output aria-live="polite">{{ Math.round(zoom * 100) }}%</output>
      <button
        aria-label="Acercar"
        title="Acercar fotografía"
        :disabled="zoom >= maxZoom"
        @click="scale(zoom + .25)"
      >
        +
      </button>
      <button
        v-if="navigation"
        aria-label="Siguiente"
        title="Fotografía siguiente"
        @click="emit('next')"
      >
        ›
      </button>
    </div>
    <div
      ref="stage"
      class="viewer-stage"
      :class="{ enlarged: zoom > 1 }"
      :data-zoom="zoom"
      :data-pan-x="x"
      :data-pan-y="y"
      @wheel.prevent="wheel"
      @pointerdown.prevent="down"
      @pointermove.prevent="move"
      @pointerup="up"
      @pointercancel="up"
      @lostpointercapture="up"
    >
      <img
        v-if="src"
        :key="src"
        :src="src"
        :alt="alt"
        :style="imageStyle"
        draggable="false"
        @load="loaded"
        @error="emit('error')"
      >
      <div
        v-else
        class="viewer-status"
      >
        <slot name="status">
          Cargando fotografía…
        </slot>
      </div>
      <span class="viewer-help">Zoom: Rueda del mouse ó en teclado +,-</span>
    </div>
    <footer class="viewer-metadata lightbox-toolbar">
      <slot />
    </footer>
  </dialog>
</template>
<style scoped>
.image-viewer{position:fixed;inset:0;margin:auto;width:calc(100vw - 24px);height:calc(100dvh - 24px);max-width:1400px;max-height:none;padding:12px;border:0;border-radius:10px;background:#101b2b;color:white;overflow:hidden;box-sizing:border-box}
.image-viewer[open]{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:8px}
.image-viewer::backdrop{background:#030914dd}
.image-viewer button{min-width:40px;min-height:40px;border:1px solid #8796a8;border-radius:6px;background:#24344a;color:white;cursor:pointer;padding:6px 10px}
.image-viewer button:disabled{opacity:.45;cursor:default}.image-viewer button:focus-visible{outline:3px solid #72c6ff;outline-offset:2px}
.viewer-close{justify-self:end}.viewer-controls{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}
.viewer-stage{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;overflow:hidden;touch-action:none;user-select:none;overscroll-behavior:contain}
.viewer-stage.enlarged{cursor:grab}.viewer-stage.enlarged:active{cursor:grabbing}
.viewer-stage img{flex:none;max-width:none;max-height:none;object-fit:contain;image-orientation:from-image;box-sizing:content-box;pointer-events:none;transform-origin:center;outline:2px solid white}
.viewer-help{position:absolute;right:8px;top:8px;padding:5px 8px;border-radius:5px;background:#101b2bd9;font-size:12px;pointer-events:none}
.viewer-metadata{max-height:25dvh;overflow:auto;overflow-wrap:anywhere;min-width:0;font-size:13px}.viewer-metadata:empty{display:none}.viewer-metadata :deep(small){display:block}.viewer-metadata :deep(a){color:#9dd9ff;margin-right:12px}
@media(max-width:600px){.image-viewer{width:100vw;height:100dvh;border-radius:0;padding:8px}.viewer-metadata{max-height:28dvh}.viewer-help{display:none}}
@media(hover:none),(pointer:coarse){.viewer-help{display:none}}
</style>
