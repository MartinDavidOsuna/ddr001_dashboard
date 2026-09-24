<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, problemMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { Page } from '@/api/types'
import { administrationCommand, administrationRoot, historyReason, type AdministrativeRecord } from './administration'
const route=useRoute(),auth=useAuthStore()
const kind=computed(() => route.path.startsWith('/cuadrillas')?'crews':route.path.startsWith('/jornadas')?'sessions':'devices')
const title=computed(() => ({crews:'Cuadrillas',sessions:'Jornadas',devices:'Dispositivos'})[kind.value])
const canEdit=computed(() => auth.user?.role==='admin')
const page=ref(1),search=ref(''),status=ref(''),result=ref<Page<AdministrativeRecord>>(),selected=ref<AdministrativeRecord>(),loading=ref(false),error=ref(''),saving=ref(false),message=ref('')
const creating=ref(false),name=ref(''),reason=ref(''),active=ref(true)
let generation=0
const statusOptions=computed(() => kind.value==='crews'?[['active','Activas'],['inactive','Inactivas']]:kind.value==='sessions'?[['open','Abiertas'],['closed','Cerradas'],['revoked','Revocadas'],['expired','Expiradas']]:[['available','Disponibles'],['blocked','Bloqueados']])
async function load() {
  const id=++generation;loading.value=true;error.value=''
  try {const r=await api.get<Page<AdministrativeRecord>>(`${administrationRoot}/${kind.value}`,{params:{page:page.value,pageSize:25,search:search.value||undefined,status:status.value||undefined}});if(id===generation)result.value=r.data}
  catch(e){if(id===generation)error.value=problemMessage(e,'No fue posible cargar los registros.')}
  finally{if(id===generation)loading.value=false}
}
async function open(row:AdministrativeRecord) {
  error.value='';message.value='';creating.value=false;reason.value=''
  const current=kind.value
  try {const r=await api.get<AdministrativeRecord>(`${administrationRoot}/${current}/${row.id}`);if(current!==kind.value)return;selected.value=r.data;name.value=r.data.name||'';active.value=!!r.data.isActive}
  catch(e){error.value=problemMessage(e,'No fue posible abrir el detalle.')}
}
function create(){selected.value=undefined;creating.value=true;name.value='';reason.value='';active.value=true;message.value=''}
async function save() {
  if(!canEdit.value||saving.value)return
  saving.value=true;error.value='';message.value=''
  let saved=false
  try {
    if(creating.value) await administrationCommand('crews',{name:name.value,reason:reason.value})
    else if(selected.value){
      const b={rowVersion:selected.value.rowVersion,reason:reason.value}
      if(kind.value==='crews')await administrationCommand(`crews/${selected.value.id}`,{...b,name:name.value,isActive:active.value},'put')
      else if(kind.value==='sessions')await administrationCommand(`sessions/${selected.value.id}/revoke`,b)
      else await administrationCommand(`devices/${selected.value.id}/block`,{...b,blocked:!selected.value.blocked})
    }
    saved=true;selected.value=undefined;creating.value=false;message.value='Cambio guardado.';await load()
  } catch(e){error.value=problemMessage(e,saved?'El cambio se guardó, pero no se pudo recargar.':'No se pudo guardar. Recarga el registro antes de reintentar.')}
  finally{saving.value=false}
}
watch(kind,()=>{page.value=1;search.value='';status.value='';selected.value=undefined;creating.value=false;void load()},{immediate:true})
function apply(){page.value=1;void load()}
function date(s?:string){return s?new Date(s).toLocaleString('es-MX'):'—'}
</script>
<template>
  <div class="content admin-directory">
    <div class="page-head"><h1>{{ title }}</h1><button v-if="kind==='crews'&&canEdit" class="btn" @click="create">Crear cuadrilla</button></div>
    <form class="card toolbar" @submit.prevent="apply"><label>Buscar<input v-model.trim="search" maxlength="180" /></label><label>Estado<select v-model="status"><option value="">Todos</option><option v-for="[value,label] in statusOptions" :key="value" :value="value">{{ label }}</option></select></label><button class="btn" :disabled="loading">Buscar</button></form>
    <p v-if="error" role="alert" class="error-box">{{ error }} <button class="btn" @click="load">Recargar listado</button><button v-if="selected" class="btn" @click="open(selected)">Recargar detalle</button></p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="loading">Cargando…</p>
    <section v-else-if="result" class="card table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Actividad</th><th>Detalle</th></tr></thead><tbody><tr v-for="row in result.items" :key="row.id"><td>{{ row.name||'Sin usuario asignado' }}<small>{{ row.crewName||row.clientApp||'' }}</small></td><td>{{ kind==='crews'?(row.isActive?'Activa':'Inactiva'):kind==='devices'?(row.blocked?'Bloqueado':'Disponible'):row.status }}</td><td>{{ kind==='crews'?`${row.userCount} usuarios`:kind==='devices'?`${row.openSessions} jornadas abiertas`:date(row.startedAt) }}</td><td><button class="btn" :disabled="saving" @click="open(row)">Abrir</button></td></tr></tbody></table><p v-if="!result.items.length">Sin registros.</p></section>
    <nav v-if="result" class="toolbar" aria-label="Paginación"><button class="btn" :disabled="page<=1||loading" @click="page--;load()">Anterior</button><span>Página {{ page }} · {{ result.total }} registros</span><button class="btn" :disabled="page*25>=result.total||loading" @click="page++;load()">Siguiente</button></nav>
    <section v-if="selected||creating" class="card editor" aria-label="Detalle administrativo">
      <h2>{{ creating?'Nueva cuadrilla':selected?.name||title }}</h2>
      <template v-if="selected"><p v-if="selected.clientApp">Aplicación: {{ selected.clientApp }}</p><p v-if="selected.model">{{ selected.platform }} · {{ selected.model }} · Última actividad {{ date(selected.lastSeenAt) }}</p><p v-if="kind==='sessions'">{{ selected.inspectionCount }} revisiones · Inicio {{ date(selected.startedAt) }} · Fin {{ date(selected.endedAt) }}</p></template>
      <form v-if="canEdit" @submit.prevent="save">
        <template v-if="kind==='crews'"><label>Nombre<input v-model.trim="name" required maxlength="120" :disabled="saving" /></label><label v-if="!creating"><input v-model="active" type="checkbox" :disabled="saving" />Activa</label></template>
        <p v-else-if="kind==='sessions'">Revocar invalida esta jornada y sus tokens. Las capturas e historia se conservan; el técnico podrá iniciar una nueva jornada.</p>
        <p v-else>{{ selected?.blocked?'Desbloquear permite iniciar una nueva sesión; no reactiva las anteriores.':'Bloquear revoca las jornadas del dispositivo e impide nuevos accesos.' }}</p>
        <label>Motivo<input v-model.trim="reason" required minlength="3" maxlength="500" :disabled="saving" /></label>
        <button class="btn btn--primary" :disabled="saving||reason.length<3||(kind==='sessions'&&selected?.status!=='open')">{{ saving?'Guardando…':kind==='crews'?'Guardar':kind==='sessions'?'Confirmar revocación':selected?.blocked?'Confirmar desbloqueo':'Confirmar bloqueo' }}</button>
      </form>
      <h3 v-if="selected">Historial administrativo</h3><p v-for="h in selected?.history" :key="h.id">{{ date(h.occurredAt) }} · {{ h.actor }} · {{ historyReason(h.afterJson) }}</p><p v-if="selected&&!selected.history?.length">Sin cambios administrativos registrados.</p>
    </section>
  </div>
</template>
<style scoped>
.admin-directory{display:grid;gap:16px}.toolbar{display:flex;gap:12px;align-items:end;flex-wrap:wrap;padding:12px}.editor{padding:20px}.editor form{display:grid;gap:12px;max-width:620px}label{display:grid;gap:5px}input,select{padding:9px;border:1px solid var(--line);border-radius:6px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:12px;border-bottom:1px solid var(--line)}small{display:block}.table-wrap{overflow:auto}
</style>
