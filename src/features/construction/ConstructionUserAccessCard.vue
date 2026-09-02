<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LockKeyhole, Save, ShieldCheck } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { mockConstructionAccessFor } from './construction.mock'
import { getConstructionAccess, updateConstructionAccess } from './construction.access.service'
import { CONSTRUCTION_DATA_MODE } from './construction.datasource'
import { constructionRoleLabels, type ConstructionRole } from './construction.types'

const props = defineProps<{ userId: string; index?: number }>()
const auth = useAuthStore()
const access = ref(mockConstructionAccessFor(props.userId, props.index))
type PreviewRole = ConstructionRole | 'none'
const selectedRole = ref<PreviewRole>(access.value.role || 'none')
const saving = ref(false)
const message = ref('')
const realMode = CONSTRUCTION_DATA_MODE === 'API_REAL'
const privilegedPreview = computed(() => realMode ? auth.user?.role === 'admin' : auth.user?.role === 'admin' || auth.user?.role === 'supervisor')
onMounted(async()=>{if(!realMode)return;try{access.value=await getConstructionAccess(props.userId);selectedRole.value=access.value.role||'none'}catch{message.value='No fue posible cargar el acceso Construction.'}})
async function save(){if(!realMode||!privilegedPreview.value||selectedRole.value==='admin'||selectedRole.value==='superadmin')return;saving.value=true;message.value='';try{const role=selectedRole.value==='none'?null:selectedRole.value;await updateConstructionAccess(props.userId,role);access.value={...access.value,role,accessEnabled:role!==null};message.value='Acceso Construction guardado.'}catch{message.value='El backend rechazó el cambio; no se modificó la vista.'}finally{saving.value=false}}
const roleLabel = computed(() => selectedRole.value === 'none' ? 'Sin acceso' : constructionRoleLabels[selectedRole.value])
const description = computed(() => {
  if (selectedRole.value === 'contractor') return 'Puede crear y gestionar sus propios levantamientos, capturar evidencia, completar etapas y atender correcciones.'
  if (selectedRole.value === 'resident') return 'Puede consultar todos los levantamientos, revisar, aceptar o rechazar y ajustar únicamente datos administrativos permitidos.'
  if (selectedRole.value === 'admin') return 'Vista preparada para acceso administrativo Construction de mayor alcance. La persistencia y autorización backend están pendientes de definición.'
  if (selectedRole.value === 'superadmin') return 'Rol administrativo proyectado por la infraestructura vigente; no se asigna desde esta vista preliminar.'
  return 'El usuario no tendría acceso a DDR001 Levantamientos.'
})
const permissions = computed(() => {
  const role = selectedRole.value
  return [
    ['Ver propios', role === 'none' ? 'No' : 'Sí'],
    ['Ver todos', ['resident', 'admin', 'superadmin'].includes(role) ? 'Sí' : 'No'],
    ['Crear', role === 'contractor' ? 'Sí' : 'No'],
    ['Capturar evidencia', role === 'contractor' ? 'Sí' : 'No'],
    ['Revisar', ['resident', 'admin', 'superadmin'].includes(role) ? 'Sí' : 'No'],
    ['Aceptar / Rechazar', ['resident', 'admin', 'superadmin'].includes(role) ? 'Sí' : 'No'],
    ['Consultar evidencia', role === 'contractor' ? 'Propia' : ['resident', 'admin', 'superadmin'].includes(role) ? 'Todas' : 'No'],
  ]
})
function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin actividad'
}
</script>

<template>
  <article class="card construction-access">
    <div class="section-head"><div><span class="eyebrow"><ShieldCheck :size="15" /> ACCESO A LEVANTAMIENTOS</span><strong>Rol Construction</strong><small>Separado del rol administrativo de plataforma/RV.</small></div><span class="api-pending">{{ realMode ? 'API_AUTHORIZED' : 'AUTHORIZATION_API_PENDING' }}</span></div>
    <div class="access-summary">
      <div><small>Rol actual</small><strong>{{ access.role ? constructionRoleLabels[access.role] : 'Sin acceso' }}</strong></div>
      <div><small>Estado del acceso</small><strong>{{ access.accessEnabled ? 'Habilitado' : 'Sin acceso' }}</strong></div>
      <div><small>Empresa</small><strong>{{ access.companyName || '—' }}</strong></div>
      <div><small>Levantamientos propios</small><strong>{{ access.ownSurveyCount }}</strong></div>
      <div><small>Última actividad Construction</small><strong>{{ formatDate(access.lastActivityAt) }}</strong></div>
    </div>

    <div class="role-editor">
      <div class="field"><label for="construction-role-preview">Previsualizar rol</label><select id="construction-role-preview" v-model="selectedRole" :disabled="!privilegedPreview"><option value="none">Sin acceso</option><option value="contractor">Contratista</option><option value="resident">Residente</option><option value="admin">Administrador</option><option v-if="access.role === 'superadmin'" value="superadmin" disabled>Superadministrador (derivado)</option></select></div>
      <div class="role-description"><strong>{{ roleLabel }}</strong><p>{{ description }}</p></div>
      <button class="btn btn--primary save" :disabled="!realMode || !privilegedPreview || saving" @click="save"><Save :size="16" /> {{ saving ? 'Guardando…' : 'Guardar rol' }}</button>
    </div>
    <p v-if="!privilegedPreview" class="authorization-note"><LockKeyhole :size="15" /> La sesión actual es de solo lectura. Los controles de cambio permanecen bloqueados.</p>
    <p v-else class="authorization-note"><LockKeyhole :size="15" /> {{ realMode ? 'Los cambios requieren confirmación del backend y quedan auditados.' : 'El selector sólo cambia esta previsualización local. No se ejecuta POST, PATCH ni PUT.' }}</p>
    <p v-if="message" class="authorization-note">{{ message }}</p>

    <div class="permissions"><strong>Permissions preview</strong><div class="permission-grid"><div v-for="[permission,value] in permissions" :key="permission"><span>{{ permission }}</span><strong>{{ value }}</strong></div></div></div>

    <div class="audit-placeholder"><strong>Historial de acceso Levantamientos</strong><div><span>01/09/2026</span><p>Contratista → Residente</p><small>Modificado por Administrador · API pendiente</small></div></div>
  </article>
</template>

<style scoped>
.construction-access{padding:17px;display:grid;gap:15px;border-top:3px solid #1765e8}.section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.section-head>div{display:grid;gap:3px}.section-head small{font-size:.7rem;color:var(--muted)}.eyebrow{display:flex;align-items:center;gap:5px;font-size:.67rem;letter-spacing:.06em;color:#52647d;font-weight:750}.api-pending{font-size:.62rem;color:#805800;background:#fff8e5;border:1px solid #ead99c;border-radius:999px;padding:5px 7px}.access-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.access-summary div{display:grid;gap:3px;background:#f7f9fb;border:1px solid var(--line);border-radius:7px;padding:10px}.access-summary small{font-size:.63rem;color:var(--muted)}.access-summary strong{font-size:.76rem}.role-editor{display:grid;grid-template-columns:minmax(180px,.7fr) 1.8fr auto;gap:10px;align-items:end}.role-description{min-height:58px;border:1px solid var(--line);border-radius:7px;padding:9px 11px;background:#fbfcfd}.role-description strong{font-size:.76rem}.role-description p{font-size:.7rem;color:var(--muted);margin:4px 0}.save{height:42px}.save:disabled{opacity:.5;cursor:not-allowed}.authorization-note{display:flex;align-items:center;gap:6px;margin:0;font-size:.7rem;color:#6d5b26;background:#fffaf0;border:1px dashed #e4d5a6;border-radius:7px;padding:9px}.permissions{display:grid;gap:8px}.permissions>strong,.audit-placeholder>strong{font-size:.75rem}.permission-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.permission-grid div{display:flex;justify-content:space-between;gap:6px;border:1px solid var(--line);border-radius:6px;padding:7px 8px;font-size:.68rem}.permission-grid span{color:#52647d}.audit-placeholder{display:grid;gap:7px;padding-top:12px;border-top:1px solid var(--line)}.audit-placeholder>div{display:grid;grid-template-columns:100px 1fr auto;gap:9px;align-items:center;font-size:.7rem}.audit-placeholder p{margin:0}.audit-placeholder small{color:var(--muted)}
@media(max-width:1050px){.access-summary{grid-template-columns:repeat(3,1fr)}.role-editor{grid-template-columns:1fr 1fr}.save{grid-column:1/-1}.permission-grid{grid-template-columns:1fr 1fr}}
@media(max-width:650px){.section-head,.role-editor{display:grid}.api-pending{justify-self:start}.access-summary,.permission-grid{grid-template-columns:1fr}.audit-placeholder>div{grid-template-columns:1fr}.save{grid-column:auto}}
</style>
