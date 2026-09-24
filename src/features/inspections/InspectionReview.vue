<script setup lang="ts">
import { ref } from 'vue'
import { problemMessage } from '@/api/client'
import { administrationCommand } from '@/features/users/administration'
const props=defineProps<{id:string;rowVersion:string}>(),emit=defineEmits<{reviewed:[]}>()
const status=ref('validated'),reason=ref(''),code=ref(''),error=ref(''),saving=ref(false),saved=ref(false)
async function save(){if(saving.value||saved.value)return;saving.value=true;error.value='';try{await administrationCommand(`inspections/${props.id}/review`,{rowVersion:props.rowVersion,status:status.value,reason:reason.value,...(status.value==='rejected'?{rejectionCode:code.value}:{})});saved.value=true;emit('reviewed')}catch(e){error.value=problemMessage(e,'No fue posible confirmar la revisión. Recarga el expediente antes de reintentar.')}finally{saving.value=false}}
</script>
<template><section class="card review"><h2>Revisión administrativa</h2><p v-if="error" role="alert">{{ error }}</p><p v-if="saved" role="status">Decisión guardada.</p><form v-else @submit.prevent="save"><label>Decisión<select v-model="status" :disabled="saving"><option value="validated">Validar</option><option value="rejected">Rechazar</option></select></label><label v-if="status==='rejected'">Código de rechazo<input v-model.trim="code" required maxlength="50" :disabled="saving" /></label><label>Motivo<textarea v-model.trim="reason" minlength="3" maxlength="500" required :disabled="saving" /></label><button class="btn btn--primary" :disabled="saving">{{ saving?'Guardando…':'Confirmar decisión' }}</button></form></section></template>
<style scoped>.review{padding:20px;margin-bottom:16px}.review form{display:grid;gap:10px;max-width:600px}label{display:grid;gap:5px}input,select,textarea{padding:8px;border:1px solid var(--line)}</style>
