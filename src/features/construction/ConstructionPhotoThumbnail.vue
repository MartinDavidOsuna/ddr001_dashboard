<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Camera } from '@lucide/vue'
import { dashboardService } from '@/services/dashboard'
const props=defineProps<{thumbnailUrl?:string|null;contentUrl?:string|null}>(),src=ref(''),unavailable=ref(false)
onMounted(async()=>{if(!props.thumbnailUrl){unavailable.value=true;return}try{src.value=await dashboardService.photo(props.thumbnailUrl)}catch{unavailable.value=true}})
onBeforeUnmount(()=>{if(src.value)URL.revokeObjectURL(src.value)})
async function open(){if(!props.contentUrl)return;try{const url=await dashboardService.photo(props.contentUrl);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60_000)}catch{unavailable.value=true}}
</script>
<template><button class="construction-photo" :disabled="!contentUrl" @click="open"><img v-if="src" :src="src" alt="Evidencia Construction"/><span v-else><Camera :size="26"/>{{ unavailable ? 'Contenido no disponible' : 'Cargando thumbnail…' }}</span></button></template>
<style scoped>.construction-photo{width:100%;height:112px;border:0;padding:0;background:linear-gradient(135deg,#edf3f8,#dfe8f1);cursor:pointer}.construction-photo:disabled{cursor:default}.construction-photo img{width:100%;height:100%;object-fit:cover}.construction-photo span{height:100%;display:grid;place-items:center;align-content:center;gap:7px;color:#7890a8;font-size:.68rem}</style>
