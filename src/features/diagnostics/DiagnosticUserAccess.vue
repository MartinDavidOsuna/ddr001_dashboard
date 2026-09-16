<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { diagnosticsApi } from "./diagnostics.api.datasource";
import { useCursor } from "./diagnostics.cursor";
import {
  canManageAccess,
  date,
  diagnosticError,
  errorCode,
} from "./diagnostics.format";
import type { Access, AccessEvent, User } from "./diagnostics.types";
import DiagnosticFields from "./DiagnosticFields.vue";
const auth = useAuthStore(),
  query = ref(""),
  enabled = ref(""),
  selected = ref<User>(),
  access = ref<Access>(),
  reason = ref(""),
  desired = ref(false),
  busy = ref(false),
  stateLoading = ref(false),
  error = ref(""),
  success = ref(""),
  history = ref<AccessEvent[]>([]),
  historyCursor = ref<string | null>(null);
const list = useCursor((cursor, signal) =>
  diagnosticsApi.users(
    {
      query: query.value.trim() || undefined,
      accessEnabled:
        enabled.value === "" ? undefined : enabled.value === "true",
      cursor,
      limit: 25,
    },
    signal,
  ),
);
let controller: AbortController | undefined,
  selection = 0;
async function select(user: User) {
  controller?.abort();
  controller = new AbortController();
  const current = ++selection;
  selected.value = user;
  access.value = undefined;
  history.value = [];
  historyCursor.value = null;
  error.value = "";
  success.value = "";
  reason.value = "";
  stateLoading.value = true;
  try {
    const result = await diagnosticsApi.access(user.userId, controller.signal);
    if (current !== selection) return;
    access.value = result;
    desired.value = result.accessEnabled;
    if (canManageAccess(auth.user?.role)) {
      const events = await diagnosticsApi.accessHistory(
        user.userId,
        { limit: 25 },
        controller.signal,
      );
      if (current !== selection) return;
      history.value = events.items;
      historyCursor.value = events.page.nextCursor;
    }
  } catch (e) {
    if (current === selection && !controller.signal.aborted)
      error.value = diagnosticError(e);
  } finally {
    if (current === selection) stateLoading.value = false;
  }
}
async function moreHistory() {
  if (!selected.value || !historyCursor.value) return;
  busy.value = true;
  try {
    const events = await diagnosticsApi.accessHistory(
      selected.value.userId,
      { cursor: historyCursor.value, limit: 25 },
      controller?.signal,
    );
    history.value.push(...events.items);
    historyCursor.value = events.page.nextCursor;
  } catch (e) {
    error.value = diagnosticError(e);
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (
    !selected.value ||
    !access.value ||
    !canManageAccess(auth.user?.role) ||
    busy.value
  )
    return;
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    await diagnosticsApi.updateAccess(selected.value.userId, {
      accessEnabled: desired.value,
      reason: reason.value.trim(),
      expectedRowVersion: access.value.rowVersion,
    });
    await select(selected.value);
    success.value = "Acceso actualizado.";
    await list.load();
  } catch (e) {
    if (errorCode(e) === "ACCESS_VERSION_CONFLICT") {
      access.value = undefined;
      await select(selected.value);
      error.value =
        "El acceso cambió en otra sesión. Se volvió a consultar el estado. Revisa el valor y escribe de nuevo el motivo antes de reintentar.";
    } else error.value = diagnosticError(e);
  } finally {
    busy.value = false;
  }
}
onMounted(list.load);
onBeforeUnmount(() => {
  selection++;
  controller?.abort();
});
</script>
<template>
  <section class="diag-stack">
    <h2>Técnicos</h2>
    <p class="diag-note">
      Actividad global de la aplicación funcional; incluye simulaciones. Los
      filtros de casos no afectan esta sección.
    </p>
    <form class="diag-filters" @submit.prevent="list.reset">
      <label
        >Buscar técnico<input
          v-model="query"
          minlength="2"
          maxlength="120"
          placeholder="Nombre o correo" /></label
      ><label
        >Acceso funcional<select v-model="enabled">
          <option value="">Todos</option>
          <option value="true">Habilitado</option>
          <option value="false">Deshabilitado</option>
        </select></label
      ><button class="btn">Buscar técnicos</button>
    </form>
    <p v-if="list.loading.value" role="status">Cargando técnicos…</p>
    <div v-else-if="list.error.value" role="alert" class="diag-alert">
      {{ list.error.value }}
      <button class="btn" @click="list.load">Reintentar técnicos</button>
    </div>
    <template v-else-if="list.data.value"
      ><div class="diag-scroll">
        <table>
          <thead>
            <tr>
              <th>Técnico</th>
              <th>Correo</th>
              <th>Usuario activo</th>
              <th>Acceso funcional</th>
              <th>Diagnósticos</th>
              <th>Última actividad</th>
              <th>Alta de acceso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in list.data.value.items" :key="u.userId">
              <td>{{ u.displayName }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.isActive ? "Sí" : "No" }}</td>
              <td>{{ u.accessEnabled ? "Habilitado" : "Deshabilitado" }}</td>
              <td>{{ u.caseCount }}</td>
              <td>{{ date(u.lastFunctionalActivityAt) }}</td>
              <td>{{ date(u.accessCreatedAt) }}</td>
              <td>
                <button class="btn" :disabled="busy" @click="select(u)">
                  Ver acceso
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!list.data.value.items.length">No hay técnicos que coincidan.</p>
      <div class="diag-pagination">
        <button
          class="btn"
          :disabled="list.history.value.length === 1"
          @click="list.previous"
        >
          Anterior</button
        ><button
          class="btn"
          :disabled="!list.data.value.page.nextCursor"
          @click="list.next"
        >
          Siguiente
        </button>
      </div></template
    >
    <section v-if="selected" class="card diag-stack">
      <h3>Acceso: {{ selected.displayName }}</h3>
      <p v-if="stateLoading">Consultando acceso…</p>
      <p v-if="error" class="diag-alert" role="alert">{{ error }}</p>
      <button
        v-if="!access && !stateLoading"
        class="btn"
        @click="select(selected)"
      >
        Reconsultar acceso
      </button>
      <p v-if="success" role="status">{{ success }}</p>
      <DiagnosticFields v-if="access" :value="{ ...access }" />
      <form
        v-if="canManageAccess(auth.user?.role) && access"
        class="diag-stack"
        @submit.prevent="save"
      >
        <label
          >Acceso funcional<select
            v-model="desired"
            :disabled="busy || stateLoading"
          >
            <option :value="true">Habilitado</option>
            <option :value="false">Deshabilitado</option>
          </select></label
        ><label
          >Motivo del cambio<textarea
            v-model="reason"
            minlength="3"
            maxlength="500"
            required
            :disabled="busy"
          /></label
        ><button
          class="btn btn-primary"
          :disabled="
            busy ||
            stateLoading ||
            reason.trim().length < 3 ||
            desired === access.accessEnabled
          "
        >
          Guardar acceso
        </button>
      </form>
      <p v-else-if="!canManageAccess(auth.user?.role)">
        Sólo admin puede cambiar el acceso.
      </p>
      <section v-if="canManageAccess(auth.user?.role)">
        <h3>Historial de acceso</h3>
        <p v-if="!history.length && !stateLoading">Sin eventos registrados.</p>
        <ol class="diag-history">
          <li v-for="h in history" :key="h.auditEventId">
            <DiagnosticFields :value="h" />
          </li>
        </ol>
        <button
          v-if="historyCursor"
          class="btn"
          :disabled="busy"
          @click="moreHistory"
        >
          Más historial
        </button>
      </section>
    </section>
  </section>
</template>
