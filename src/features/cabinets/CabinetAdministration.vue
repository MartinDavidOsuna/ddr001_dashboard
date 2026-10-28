<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { problemMessage } from "@/api/client";
import { commandUuid } from "@/utils/commandUuid";
import { cabinetsApi } from "./cabinets.api";
import { date } from "./cabinets.format";
import type {
  CabinetAdminDossier,
  CabinetAdminEditRequest,
  CabinetAdminOptions,
} from "./cabinets.generated";

const props = defineProps<{ dossier: CabinetAdminDossier }>();
const emit = defineEmits<{ changed: [message: string]; deleted: [] }>();
const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.role === "admin");
const mode = ref<"" | "edit" | "cancel" | "delete">("");
const busy = ref(false),
  error = ref(""),
  reason = ref(""),
  confirmed = ref(false),
  confirmUid = ref("");
const options = ref<CabinetAdminOptions | null>(null);
const form = reactive({
  model: "",
  automated: false,
  companyId: "",
  installationDate: "",
  administrativeNotes: "",
  installationObservations: "",
});
const hasInstallation = computed(() =>
  Boolean(
    props.dossier.installation.data ||
    props.dossier.installation.closureOperationId ||
    props.dossier.base,
  ),
);
const canDelete = computed(
  () =>
    !hasInstallation.value &&
    !props.dossier.installation.valid &&
    !props.dossier.finalReview.approval &&
    !["installed", "deliverable"].includes(props.dossier.identification.status),
);
const archived = computed(() =>
  Boolean(props.dossier.administration?.archivedAt),
);
let lastRequest: { signature: string; operationId: string } | undefined;

async function open(action: typeof mode.value) {
  if (!isAdmin.value || busy.value) return;
  mode.value = action;
  error.value = "";
  reason.value = "";
  confirmed.value = false;
  confirmUid.value = "";
  lastRequest = undefined;
  if (action !== "edit") return;
  const d = props.dossier;
  Object.assign(form, {
    model: d.identification.model,
    automated: d.identification.automated,
    companyId: d.identification.crew?.id ?? "",
    installationDate: (
      d.administration?.installationDate ??
      d.identification.installedAt ??
      ""
    ).slice(0, 16),
    administrativeNotes: d.administration?.administrativeNotes ?? "",
    installationObservations: d.installation.data?.observations ?? "",
  });
  busy.value = true;
  try {
    options.value = await cabinetsApi.options();
  } catch (cause) {
    error.value = problemMessage(
      cause,
      "No se pudieron cargar los catálogos administrativos.",
    );
  } finally {
    busy.value = false;
  }
}
function changes(): CabinetAdminEditRequest["changes"] {
  const d = props.dossier,
    result: CabinetAdminEditRequest["changes"] = {};
  if (form.model !== d.identification.model)
    result.model = form.model as NonNullable<typeof result.model>;
  if (form.automated !== d.identification.automated)
    result.automated = form.automated;
  if (form.companyId && form.companyId !== d.identification.crew?.id)
    result.companyId = form.companyId;
  const originalDate = (
    d.administration?.installationDate ??
    d.identification.installedAt ??
    ""
  ).slice(0, 16);
  if (form.installationDate !== originalDate)
    result.installationDate = form.installationDate
      ? new Date(form.installationDate + "Z").toISOString()
      : null;
  if (
    form.administrativeNotes !== (d.administration?.administrativeNotes ?? "")
  )
    result.administrativeNotes = form.administrativeNotes;
  if (
    d.installation.data &&
    form.installationObservations !== (d.installation.data.observations ?? "")
  )
    result.installationObservations = form.installationObservations;
  return result;
}
async function submit() {
  if (!isAdmin.value || busy.value || !mode.value || archived.value) return;
  error.value = "";
  if (reason.value.trim().length < 3) {
    error.value = "Escriba un motivo de al menos tres caracteres.";
    return;
  }
  if (mode.value !== "edit" && !confirmed.value) {
    error.value = "Confirme expresamente la operación.";
    return;
  }
  if (
    mode.value === "delete" &&
    (!canDelete.value || confirmUid.value !== props.dossier.identification.uid)
  ) {
    error.value = "Verifique el estado y escriba el UID completo.";
    return;
  }
  let changed: CabinetAdminEditRequest["changes"] = {};
  try {
    if (mode.value === "edit") changed = changes();
  } catch {
    error.value = "La fecha de instalación no es válida.";
    return;
  }
  if (mode.value === "edit" && !Object.keys(changed).length) {
    error.value = "No hay cambios para guardar.";
    return;
  }
  const signature = JSON.stringify({
    mode: mode.value,
    reason: reason.value.trim(),
    changed,
    version: props.dossier.identification.version,
    uid: confirmUid.value,
  });
  if (lastRequest?.signature !== signature)
    lastRequest = { signature, operationId: commandUuid() };
  const body = {
    operationId: lastRequest.operationId,
    expectedVersion: props.dossier.identification.version,
    reason: reason.value.trim(),
  };
  busy.value = true;
  try {
    const id = props.dossier.identification.cabinetId;
    if (mode.value === "edit")
      await cabinetsApi.edit(id, { ...body, changes: changed });
    else if (mode.value === "cancel")
      await cabinetsApi.cancelInstallation(id, { ...body, confirm: true });
    else
      await cabinetsApi.delete(id, {
        ...body,
        confirm: true,
        confirmUid: confirmUid.value,
      });
    const deleted = mode.value === "delete";
    mode.value = "";
    if (deleted) emit("deleted");
    else
      emit(
        "changed",
        "Operación administrativa guardada. Expediente actualizado.",
      );
  } catch (cause) {
    error.value = problemMessage(
      cause,
      "No se pudo confirmar la operación. Puede reintentar la misma solicitud; se conserva su identificador.",
    );
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section
    v-if="isAdmin"
    class="card cabinet-administration"
    aria-labelledby="cabinet-administration-title"
  >
    <h2 id="cabinet-administration-title">
      Administración
    </h2>
    <p
      v-if="archived"
      role="status"
    >
      Gabinete eliminado administrativamente. El expediente, historial y
      evidencias se conservan.
    </p>
    <template v-else>
      <button
        class="btn"
        :disabled="busy"
        @click="open('edit')"
      >
        Editar gabinete
      </button>
      <details class="cabinet-danger-zone">
        <summary>Acciones de invalidación y eliminación</summary>
        <p>Estas operaciones requieren motivo y confirmación independiente.</p>
        <button
          class="btn"
          :disabled="busy || !hasInstallation"
          @click="open('cancel')"
        >
          Cancelar instalación
        </button>
        <button
          class="btn cabinet-danger"
          :disabled="busy || !canDelete"
          @click="open('delete')"
        >
          Eliminar gabinete
        </button>
        <p v-if="!canDelete">
          Para eliminar, primero debe cancelar la instalación y revisar que la
          base esté libre y no haya aprobación vigente.
        </p>
      </details>
      <form
        v-if="mode"
        class="cabinet-admin-form"
        @submit.prevent="submit"
      >
        <h3>
          {{
            mode === "edit"
              ? "Editar gabinete"
              : mode === "cancel"
                ? "Cancelar instalación"
                : "Eliminar gabinete"
          }}
        </h3>
        <template v-if="mode === 'edit'">
          <p>
            El cambio de modelo o automatización requiere revalidar piezas e
            instalación e invalida la aprobación. Las observaciones operativas
            también invalidan el cierre y su aprobación.
          </p>
          <label>Empresa asociada
            <select
              v-model="form.companyId"
              :disabled="busy || !options"
            >
              <option
                value=""
                disabled
              >Sin empresa asignada</option>
              <option
                v-if="
                  form.companyId &&
                    !options?.companies.some((c) => c.id === form.companyId)
                "
                :value="form.companyId"
              >
                {{ dossier.identification.crew?.name }} (actual)
              </option>
              <option
                v-for="company in options?.companies"
                :key="company.id"
                :value="company.id"
              >
                {{ company.name }}
              </option>
            </select>
          </label>
          <label>Modelo
            <select
              v-model="form.model"
              :disabled="busy || !options"
            >
              <option
                v-for="model in options?.models"
                :key="model"
                :value="model"
              >
                {{ model }}
              </option>
            </select>
          </label>
          <label><input
            v-model="form.automated"
            type="checkbox"
            :disabled="busy"
          >
            Automatizado</label>
          <label v-if="dossier.installation.data">Fecha administrativa de instalación (UTC)
            <input
              v-model="form.installationDate"
              type="datetime-local"
              :disabled="busy"
            >
          </label>
          <p>
            La fecha administrativa conserva la fecha original de captura en el
            historial.
          </p>
          <label>Información administrativa<textarea
            v-model="form.administrativeNotes"
            maxlength="2000"
            :disabled="busy"
          />
          </label>
          <label v-if="dossier.installation.data">Observaciones operativas de instalación<textarea
            v-model="form.installationObservations"
            maxlength="2000"
            :disabled="busy"
          />
          </label>
          <p>
            UID, QR, series, identificadores, evidencias y base vinculada se
            conservan mediante sus flujos específicos.
          </p>
        </template>
        <p
          v-else-if="mode === 'cancel'"
          class="cabinet-warning"
        >
          Esta operación cancelará la instalación actual y liberará la base
          asociada. La base no será eliminada. El historial y las evidencias se
          conservarán. Cualquier aprobación final asociada a esta instalación
          quedará invalidada. La app recibirá el nuevo estado en la siguiente
          sincronización.
        </p>
        <template v-else>
          <p class="cabinet-warning">
            Eliminará el gabinete del listado activo mediante una marca lógica.
            Se conservarán el expediente, historial, fotografías y auditoría.
            Esta confirmación es independiente de cancelar la instalación.
          </p>
          <label>Escriba el UID completo {{ dossier.identification.uid
          }}<input
            v-model="confirmUid"
            :disabled="busy"
            autocomplete="off"
          ></label>
        </template>
        <label>Motivo obligatorio<textarea
          v-model="reason"
          required
          minlength="3"
          maxlength="2000"
          :disabled="busy"
        />
        </label>
        <label v-if="mode !== 'edit'"><input
          v-model="confirmed"
          type="checkbox"
          required
          :disabled="busy"
        >
          Comprendo y confirmo esta operación.</label>
        <p
          v-if="error"
          role="alert"
          class="cabinet-error"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          class="btn"
          :disabled="busy || (mode === 'edit' && !options)"
        >
          {{
            busy
              ? "Guardando…"
              : mode === "edit"
                ? "Guardar cambios"
                : mode === "cancel"
                  ? "Confirmar cancelación"
                  : "Confirmar eliminación"
          }}
        </button>
        <button
          type="button"
          class="btn"
          :disabled="busy"
          @click="mode = ''"
        >
          Volver sin cambios
        </button>
      </form>
    </template>
    <details v-if="dossier.administrativeHistory?.length">
      <summary>
        Historial administrativo ({{ dossier.administrativeHistory.length }})
      </summary>
      <article
        v-for="event in dossier.administrativeHistory"
        :key="event.audit_id"
      >
        <p>
          {{ event.actorName ?? event.actor_id ?? "Administrador no disponible" }} ·
          {{ date(event.occurred_at) }} · {{ event.action }}
        </p>
        <details>
          <summary>Valores anteriores y posteriores</summary>
          <pre>{{ event.before_json }}</pre>
          <pre>{{ event.after_json }}</pre>
        </details>
      </article>
    </details>
  </section>
</template>

<style scoped>
.cabinet-danger-zone {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #b45309;
  border-radius: 0.5rem;
}
.cabinet-admin-form {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
  max-width: 48rem;
}
.cabinet-admin-form label {
  display: grid;
  gap: 0.35rem;
}
.cabinet-admin-form input[type="checkbox"] {
  width: auto;
  justify-self: start;
}
.cabinet-admin-form textarea {
  min-height: 5rem;
}
.cabinet-danger {
  color: #991b1b;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 20rem;
  overflow: auto;
}
</style>
