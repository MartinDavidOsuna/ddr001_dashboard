<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue';
import {hydroApi,type Evidence} from './hydrostatic.api';
import {label,date} from './hydrostatic.format';
const props=defineProps<{testId:string;photo:Evidence}>();
const emit=defineEmits<{open:[]}>();
const src=ref(''),error=ref(''),loading=ref(false);let controller:AbortController|undefined;let generation=0;
function clear(){generation++;controller?.abort();if(src.value)URL.revokeObjectURL(src.value);src.value='';}
async function load(){clear();error.value='';if(!props.photo.verified||!props.photo.thumbnailAvailable)return;const current=generation;controller=new AbortController();loading.value=true;try{const blob=await hydroApi.photo(props.testId,props.photo.id,'thumbnail',controller.signal);if(current===generation)src.value=URL.createObjectURL(blob);}catch{if(current===generation)error.value='Miniatura no disponible en servidor/almacenamiento. Reintenta.';}finally{if(current===generation)loading.value=false;}}
watch(()=>[props.testId,props.photo.id],()=>void load(),{immediate:true});onBeforeUnmount(clear);
</script>
<template>
  <article class="card hydro-photo">
    <button
      class="btn"
      :disabled="!photo.verified"
      @click="emit('open')"
    >
      <img
        v-if="src"
        :src="src"
        :alt="label(photo.role)"
      ><span v-else>{{ loading?'Cargando…':'Sin miniatura' }} · Abrir original</span>
    </button><h3>{{ label(photo.role) }}</h3><p>{{ label(photo.integrityState) }} · {{ label(photo.uploadState) }}<br>{{ date(photo.capturedAt) }} · {{ photo.byteLength }} bytes</p><p v-if="photo.location">
      GPS: {{ photo.location.latitude }}, {{ photo.location.longitude }}
    </p><p>Uniones: {{ photo.joints.join(', ')||'No aplica' }}</p><p
      v-if="error"
      role="alert"
    >
      {{ error }} <button
        class="btn"
        @click="load"
      >
        Reintentar miniatura
      </button>
    </p>
  </article>
</template>
<style scoped>.hydro-photo img{width:100%;height:160px;object-fit:contain}.hydro-photo button{width:100%}</style>
