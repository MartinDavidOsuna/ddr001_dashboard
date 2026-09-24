<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api,problemMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { DashboardUserDetail,FilterOption } from '@/api/types'
import { dashboardService } from '@/services/dashboard'
import { administrationCommand,administrationRoot,historyReason,type AdministrativeHistory } from './administration'
const props=defineProps<{user?:DashboardUserDetail}>(),emit=defineEmits<{saved:[id:string]}>()
const auth=useAuthStore(),canEdit=computed(()=>auth.user?.role==='admin')
const name=ref(''),email=ref(''),phone=ref(''),crew=ref(''),active=ref(true),reason=ref(''),error=ref(''),saving=ref(false),crews=ref<FilterOption[]>([]),history=ref<AdministrativeHistory[]>([])
watch(()=>props.user,async u=>{name.value=u?.fullName||'';email.value=u?.email||'';phone.value=u?.phone||'';crew.value=u?.crewId||'';active.value=u?.isActive??true;reason.value='';history.value=[];
  try {crews.value=(await dashboardService.filters()).crews;if(u)history.value=(await api.get(`${administrationRoot}/users/${u.userId}/history`)).data.items}
  catch(e){error.value=problemMessage(e,'No se pudieron cargar cuadrillas o historial.')}
},{immediate:true})
async function save(){
  if(!canEdit.value||saving.value)return;saving.value=true;error.value=''
  try{const body={fullName:name.value,phone:phone.value,crewId:crew.value||null,reason:reason.value};const r=props.user?await administrationCommand(`users/${props.user.userId}`,{...body,isActive:active.value,rowVersion:props.user.rowVersion},'put'):await administrationCommand('users',{...body,email:email.value});emit('saved',r.id)}
  catch(e){error.value=problemMessage(e,'No se pudo guardar; recarga el usuario antes de reintentar.')}
  finally{saving.value=false}
}
</script>
<template><section class="card user-editor"><h2>{{ user?'Administración del usuario':'Nuevo usuario' }}</h2><p v-if="error" role="alert">{{ error }}</p>
  <form v-if="canEdit" @submit.prevent="save"><label>Nombre<input v-model.trim="name" required minlength="2" maxlength="180" :disabled="saving" /></label><label>Correo<input v-model.trim="email" type="email" required maxlength="254" :disabled="!!user||saving" /></label><label>Teléfono<input v-model.trim="phone" required pattern="[0-9]{10}" maxlength="10" :disabled="saving" /></label><label>Cuadrilla<select v-model="crew" :disabled="saving"><option value="">Sin asignar</option><option v-for="c in crews" :key="c.id" :value="c.id">{{ c.label }}</option></select></label><label v-if="user"><input v-model="active" type="checkbox" :disabled="saving" />Usuario activo</label><p v-if="user&&!active">Desactivar revoca sus jornadas e impide iniciar nuevas. Se conserva la información capturada.</p><p>El correo identifica al usuario y no se modifica. Los datos guardados aquí tendrán prioridad sobre el nombre y teléfono enviados al iniciar sesión móvil.</p><label>Motivo<input v-model.trim="reason" required minlength="3" maxlength="500" :disabled="saving" /></label><button class="btn btn--primary" :disabled="saving||reason.length<3">{{ saving?'Guardando…':'Guardar cambios' }}</button></form>
  <template v-if="user"><p v-if="canEdit">Cambiar la cuadrilla revoca las jornadas abiertas para aplicar la asignación en el siguiente inicio de sesión.</p><h3>Historial administrativo</h3><p v-for="h in history" :key="h.id">{{ new Date(h.occurredAt).toLocaleString('es-MX') }} · {{ h.actor }} · {{ historyReason(h.afterJson) }}</p><p v-if="!history.length">Sin cambios administrativos registrados.</p></template>
</section></template>
<style scoped>.user-editor{padding:20px;margin-top:16px}.user-editor form{display:grid;gap:12px;max-width:650px}label{display:grid;gap:5px}input,select{padding:9px;border:1px solid var(--line);border-radius:6px}</style>
