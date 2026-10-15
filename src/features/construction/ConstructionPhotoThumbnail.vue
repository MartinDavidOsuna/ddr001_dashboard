<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import ImageViewer from '@/components/ImageViewer.vue'
import { Camera } from '@lucide/vue'
import { dashboardService } from '@/services/dashboard'

const props = defineProps<{ thumbnailUrl?: string | null; contentUrl?: string | null }>()
const src = ref('')
const unavailable = ref(false)
const opening = ref(false)
const contentError = ref('')
const opened = ref(false)
const fullImage = ref('')
let version = 0
let contentVersion = 0
function imageError() {
  contentError.value = 'La fotografía no se pudo visualizar.'
  if (fullImage.value) URL.revokeObjectURL(fullImage.value)
  fullImage.value = ''
}
function close() {
  ++contentVersion
  opening.value = false
  opened.value = false
  if (fullImage.value) URL.revokeObjectURL(fullImage.value)
  fullImage.value = ''
}
watch(() => [props.thumbnailUrl, props.contentUrl], async () => {
  const id = ++version
  close()
  contentError.value = ''
  if (src.value) URL.revokeObjectURL(src.value)
  src.value = ''
  unavailable.value = !props.thumbnailUrl
  if (!props.thumbnailUrl) return
  try {
    const url = await dashboardService.photo(props.thumbnailUrl)
    if (id !== version) URL.revokeObjectURL(url)
    else src.value = url
  } catch { if (id === version) unavailable.value = true }
}, { immediate: true })
onBeforeUnmount(() => {
  ++version
  close()
  if (src.value) URL.revokeObjectURL(src.value)
})
async function open() {
  if (!props.contentUrl || opening.value) return
  const id = ++contentVersion
  opening.value = true
  contentError.value = ''
  if (fullImage.value) URL.revokeObjectURL(fullImage.value)
  fullImage.value = ''
  opened.value = true
  try {
    const url = await dashboardService.photo(props.contentUrl)
    if (id !== contentVersion) URL.revokeObjectURL(url)
    else fullImage.value = url
  } catch {
    if (id === contentVersion) contentError.value = 'No fue posible cargar la fotografía. Verifica que la evidencia esté disponible en el servidor.'
  } finally { if (id === contentVersion) opening.value = false }
}
</script>

<template>
  <button class="construction-photo" :disabled="!contentUrl" aria-label="Abrir fotografía del levantamiento" @click="open">
    <img v-if="src && !unavailable" :src="src" alt="Evidencia del levantamiento" @error="unavailable = true" />
    <span v-else><Camera :size="26" />{{ unavailable ? 'Miniatura no disponible' : 'Cargando miniatura…' }}</span>
  </button>
  <ImageViewer :open="opened" :src="fullImage" alt="Fotografía del levantamiento" :photo-key="contentUrl || ''" @close="close" @error="imageError">
    <template #status>
      <p v-if="opening" role="status">Cargando fotografía…</p>
      <p v-else-if="contentError" role="alert">{{ contentError }} <button class="btn" @click="open">Reintentar</button></p>
    </template>
  </ImageViewer>
</template>

<style scoped>
.construction-photo{width:100%;height:112px;border:0;padding:0;background:linear-gradient(135deg,#edf3f8,#dfe8f1);cursor:pointer}.construction-photo:disabled{cursor:default}.construction-photo img{width:100%;height:100%;object-fit:cover}.construction-photo span{height:100%;display:grid;place-items:center;align-content:center;gap:7px;color:#7890a8;font-size:.68rem}
</style>
