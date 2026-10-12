<script setup lang="ts">
import type { CabinetAdminHistory } from "./cabinets.generated";
import { date, label, text, presence } from "./cabinets.format";
defineProps<{ events: CabinetAdminHistory[] }>();
</script>
<template>
  <p v-if="!events.length">
    Sin intentos registrados.
  </p>
  <ol
    v-else
    class="cabinet-timeline"
  >
    <li
      v-for="event in events"
      :key="event.operationId"
    >
      <strong>{{ label(event.type) }}</strong> ·
      {{ event.actor.name || event.actor.id }}
      <p>
        Captura Field: {{ date(event.capturedAt) }}<br>Recepción servidor:
        {{ date(event.receivedAt) }}<br>Versión {{ event.previousVersion }} →
        {{ event.resultVersion }} · Estado resultante: {{ label(event.status) }}
      </p>
      <p
        v-if="event.approvalInvalidated"
        class="cabinet-warning"
      >
        Esta operación invalidó una aprobación anterior.
      </p>
      <details>
        <summary>Resultado e información de captura</summary>
        <p>
          Operación: {{ event.operationId }}<br>Piezas validadas en este
          momento: {{ presence(event.cabinet.partsValidated) }}<br>Instalación
          válida en este momento: {{ presence(event.cabinet.installationValid)
          }}<br>Aprobación en este snapshot histórico:
          {{ event.cabinet.approval ? "Sí" : "No" }}<br>Pendientes:
          {{ event.cabinet.pending.length }}
        </p>
        <p v-if="'reason' in event.command">
          Razón: {{ text(event.command.reason) }}
        </p>
        <p v-if="event.command.type === 'final_review'">
          Dictamen:
          {{
            event.command.verdict === "approve"
              ? "Aprobación histórica"
              : "Corrección requerida"
          }}
        </p>
        <ul v-if="event.command.type === 'parts_save'">
          <li
            v-for="part in event.command.parts"
            :key="part.code"
          >
            {{ part.code }} · Presente: {{ presence(part.present) }} · Serie:
            {{ text(part.serial) }} · {{ label(part.serialException) }} ·
            {{ text(part.observations) }}
          </li>
        </ul>
        <ul v-if="event.command.type === 'installation_save'">
          <li
            v-for="answer in event.command.installation.answers"
            :key="answer.code"
          >
            {{ answer.code }} · {{ label(answer.answer) }} ·
            {{ text(answer.reason) }}
          </li>
        </ul>
      </details>
    </li>
  </ol>
</template>
