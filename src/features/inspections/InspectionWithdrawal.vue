<script setup lang="ts">
import { ref } from 'vue'
import { dashboardService } from '@/services/dashboard'
import { problemMessage } from '@/api/client'

const props = defineProps<{ inspectionId: string; rowVersion: string; accountNumber: string; revisionNumber: number }>()
const emit = defineEmits<{ withdrawn: [] }>()
const dialog = ref<HTMLDialogElement>(), reason = ref(''), confirmed = ref(false), busy = ref(false), error = ref('')
let commandId = ''
function open() {
  commandId = crypto.randomUUID()
  reason.value = ''; confirmed.value = false; error.value = ''
  dialog.value?.showModal()
}
async function submit() {
  if (busy.value || !confirmed.value || reason.value.trim().length < 3) return
  busy.value = true; error.value = ''
  try {
    await dashboardService.withdrawInspection(props.inspectionId, { reason: reason.value.trim(), rowVersion: props.rowVersion, commandId })
    dialog.value?.close(); emit('withdrawn')
  } catch (e) { error.value = problemMessage(e, 'No se pudo confirmar la baja. Puedes reintentar o recargar el detalle.') }
  finally { busy.value = false }
}
</script>

<template>
  <button class="btn withdrawal-button" @click="open">Dar de baja revisión</button>
  <dialog ref="dialog" aria-labelledby="withdrawal-title" @cancel="busy && $event.preventDefault()">
    <form @submit.prevent="submit">
      <h2 id="withdrawal-title">Dar de baja revisión RV</h2>
      <p><strong>Hidrante {{ accountNumber }} · Revisión #{{ revisionNumber }}</strong></p>
      <p>Se ocultará de los listados, indicadores y exportaciones habituales del dashboard.
        El historial, las respuestas y las fotografías se conservarán en el archivo de bajas.</p>
      <p>La baja no cambia el estado de la revisión ni habilita una nueva captura del hidrante.</p>
      <label for="withdrawal-reason">Motivo de la baja</label>
      <textarea id="withdrawal-reason" v-model="reason" required minlength="3" maxlength="500" rows="4" :disabled="busy" autofocus />
      <label class="confirmation"><input v-model="confirmed" type="checkbox" :disabled="busy" required />
        Confirmo la baja de esta revisión.</label>
      <p v-if="error" role="alert" class="error-box">{{ error }}</p>
      <div class="actions">
        <button type="button" class="btn" :disabled="busy" @click="dialog?.close()">Cancelar</button>
        <button class="btn withdrawal-button" :disabled="busy || !confirmed || reason.trim().length < 3">{{ busy ? 'Confirmando…' : 'Confirmar baja' }}</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.withdrawal-button { color: #a51d2d; border-color: #d698a0; }
dialog { width: min(540px, calc(100% - 32px)); max-height: calc(100dvh - 40px); overflow: auto; border: 1px solid #d6dce5; border-radius: 12px; padding: 24px; color: #24344a; }
dialog::backdrop { background: #10203088; }
form { display: grid; gap: 14px; }
h2, p { margin: 0; } p { line-height: 1.5; }
textarea { width: 100%; box-sizing: border-box; font: inherit; padding: 10px; border: 1px solid #aebaca; border-radius: 6px; resize: vertical; }
.confirmation { display: flex; gap: 8px; align-items: flex-start; }
.actions { display: flex; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
</style>
