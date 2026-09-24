<script setup lang="ts">
import { onMounted,ref } from 'vue'
import { api,problemMessage } from '@/api/client'
const version=__PLATFORM_VERSION__,commit=__BUILD_COMMIT__,builtAt=__BUILD_DATE__
const server=ref<{version:string;commit:string;environment:string;builtAt:string;features:Record<string,boolean>}>(),error=ref('')
onMounted(async()=>{try{server.value=(await api.get('/version')).data}catch(e){error.value=problemMessage(e,'No se pudo consultar la versión del servidor.')}})
</script>
<template><div class="content"><h1>Acerca de DDR001</h1><section class="card about"><h2>Dashboard {{ version }}</h2><p>Commit: {{ commit }}</p><p>Compilación: {{ builtAt }}</p></section><section class="card about"><h2>API</h2><p v-if="error" role="alert">{{ error }}</p><template v-if="server"><p>Versión: {{ server.version }}</p><p>Commit: {{ server.commit }}</p><p>Ambiente: {{ server.environment }}</p><p>Compilación: {{ server.builtAt }}</p></template><p v-else-if="!error">Consultando…</p></section></div></template>
<style scoped>.about{padding:20px;margin-top:15px;overflow-wrap:anywhere}</style>
