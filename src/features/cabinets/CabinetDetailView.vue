<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { cabinetsApi } from "./cabinets.api";
import type { CabinetAdminDossier, CabinetGps } from "./cabinets.generated";
import { useCabinetResource } from "./cabinets.resource";
import { date, label, text, presence, displayModel } from "./cabinets.format";
import {
  checklistGroups,
  photoGroups,
  photoRelations,
} from "./cabinets.dossier";
import CabinetPending from "./CabinetPending.vue";
import CabinetTimeline from "./CabinetTimeline.vue";
import CabinetPhoto from "./CabinetPhoto.vue";
import "./cabinets.css";
const route = useRoute(),
  resource = useCabinetResource<CabinetAdminDossier>();
const dossier = computed(() => resource.data.value);
function load() {
  void resource.load((signal) =>
    cabinetsApi.detail(String(route.params.cabinetId), signal),
  );
}
watch(() => route.params.cabinetId, load, { immediate: true });
const gps = (value?: CabinetGps | null) =>
  value
    ? `${value.latitude}, ${value.longitude} · precisión ${text(value.accuracy)} m`
    : "—";
const actor = (id: string) =>
  dossier.value?.history.find((e) => e.actor.id === id)?.actor.name || id;
const piecePhotos = (code: string) =>
  dossier.value?.photos.filter((p) =>
    p.relations.some((r) => r.subject === code),
  ) || [];
</script>
<template>
  <main class="content cabinets cabinet-stack">
    <RouterLink
      class="back-link"
      :to="{ path: '/levantamientos/nuevos-hidrantes', query: route.query }"
    >
      ← Volver a Nuevos Hidrantes
    </RouterLink>
    <p
      v-if="resource.loading.value"
      role="status"
      class="card cabinet-loading"
    >
      Cargando expediente de nuevo hidrante…
    </p>
    <div
      v-else-if="resource.error.value"
      role="alert"
      class="cabinet-error"
    >
      {{ resource.error.value }}
      <button
        class="btn"
        @click="load"
      >
        Reintentar expediente
      </button>
    </div>
    <template v-if="dossier">
      <header
        id="registration"
        class="card cabinet-head"
      >
        <div>
          <h1 class="page-title">
            {{ dossier.identification.formattedUid }}
          </h1>
          <p>
            {{ displayModel(dossier.identification) }} ·
            {{ dossier.identification.automated ? "Automatizado" : "Estándar" }}
          </p>
          <span :class="['cabinet-badge', dossier.identification.status]">{{
            dossier.identification.status === "deliverable"
              ? "HIDRANTE ENTREGABLE"
              : label(dossier.identification.status)
          }}</span>
        </div>
        <div>
          <small>Versión {{ dossier.identification.version }} · Catálogo
            {{ dossier.identification.catalogVersion }}<br>Política
            {{ dossier.identification.policyVersion }}</small>
          <p>
            Registro: {{ date(dossier.identification.registeredAt)
            }}<br>Validación: {{ date(dossier.identification.validatedAt)
            }}<br>Instalación: {{ date(dossier.identification.installedAt)
            }}<br>Entregable vigente:
            {{ date(dossier.identification.deliverableAt) }}
          </p>
        </div>
      </header>
      <nav
        class="cabinet-tabs"
        aria-label="Secciones del expediente"
      >
        <a
          v-for="[id, name] in [
            ['base', 'Base'],
            ['pieces', 'Piezas'],
            ['installation', 'Instalación'],
            ['final-review', 'Revisión final'],
            ['photos', 'Fotografías'],
            ['history', 'Historial'],
          ]"
          :key="id"
          class="btn"
          :href="`#${id}`"
        >{{ name }}</a>
      </nav>
      <section
        id="base"
        class="card"
      >
        <h2>Base vinculada</h2>
        <p>
          Empresa:
          {{
            dossier.identification.crew?.name || "Sin empresa / Sin asignación"
          }}
          · Fuente: cuadrilla actual de la base.
        </p>
        <template v-if="dossier.base">
          <dl class="cabinet-fields">
            <div>
              <dt>Identificador / estado de base</dt>
              <dd>
                {{ dossier.base.displayIdentifier }} · {{ dossier.base.status }}
              </dd>
            </div>
            <div>
              <dt>Cuenta de base</dt>
              <dd>{{ text(dossier.base.accountNumber) }}</dd>
            </div>
            <div>
              <dt>Cuenta de instalación</dt>
              <dd>{{ text(dossier.base.installationAccountNumber) }}</dd>
            </div>
            <div>
              <dt>Coordenada canónica de base</dt>
              <dd>{{ gps(dossier.base.location) }}</dd>
            </div>
            <div>
              <dt>Distancia base ↔ instalación (informativa)</dt>
              <dd>
                {{
                  dossier.base.distanceToInstallationMeters == null
                    ? "—"
                    : `${dossier.base.distanceToInstallationMeters.toFixed(1)} m`
                }}
              </dd>
            </div>
          </dl>
          <p
            v-if="dossier.base.accountDiscrepancy"
            class="cabinet-warning"
          >
            La cuenta de la base y la cuenta de instalación son distintas. Se
            conservan ambos datos; consulta la resolución registrada.
          </p>
          <RouterLink
            class="btn"
            :to="`/levantamientos/bases/${dossier.base.surveyId}`"
          >
            Ver expediente de base
          </RouterLink>
        </template>
        <p v-else>
          Sin base vinculada.
        </p>
      </section>
      <section
        id="pieces"
        class="card"
      >
        <h2>Revisión de piezas</h2>
        <p>
          {{
            dossier.pieces.validated
              ? "Piezas validadas"
              : "Piezas pendientes de validación"
          }}
          · Catálogo congelado {{ dossier.pieces.catalogVersion }}. Las
          fotografías de piezas y legibilidad son opcionales según el contrato;
          no se considera error su ausencia.
        </p>
        <details
          v-for="group in dossier.pieces.groups"
          :key="group.position"
          open
        >
          <summary>
            Grupo {{ group.position }} · {{ group.partCodes.length }} instancias
          </summary>
          <article
            v-for="part in dossier.pieces.instances.filter((p) =>
              group.partCodes.includes(p.code),
            )"
            :id="`piece-${encodeURIComponent(part.code)}`"
            :key="part.code"
            class="cabinet-piece"
          >
            <h3>{{ part.description }}</h3>
            <dl class="cabinet-fields">
              <div>
                <dt>Código / instancia</dt>
                <dd>
                  {{ part.code }} · Cantidad en definición:
                  {{ part.source.quantity }}
                </dd>
              </div>
              <div>
                <dt>Presencia</dt>
                <dd>{{ presence(part.capture?.present) }}</dd>
              </div>
              <div>
                <dt>Serie</dt>
                <dd>
                  {{ text(part.capture?.serial) }} ·
                  {{ label(part.serialState) }}
                </dd>
              </div>
              <div>
                <dt>Observación / razón</dt>
                <dd>
                  {{ text(part.capture?.observations) }} ·
                  {{ text(part.capture?.reason) }}
                </dd>
              </div>
              <div>
                <dt>Última captura</dt>
                <dd v-if="part.lastCapture">
                  {{ actor(part.lastCapture.actorId) }}<br>Captura
                  {{ date(part.lastCapture.capturedAt) }}<br>Recepción
                  {{ date(part.lastCapture.receivedAt) }}
                </dd>
                <dd v-else>
                  —
                </dd>
              </div>
            </dl>
            <CabinetPending
              :items="part.pending"
              :dossier="dossier"
            /><a
              v-for="photo in piecePhotos(part.code)"
              :key="photo.photoId"
              class="btn"
              :href="`#photo-${photo.photoId}`"
            >Ver fotografía relacionada</a>
          </article>
        </details>
        <details>
          <summary>
            Intentos de validación ({{ dossier.pieces.attempts.length }})
          </summary>
          <CabinetTimeline :events="dossier.pieces.attempts" />
        </details>
      </section>
      <section
        id="installation"
        class="card"
      >
        <h2>Instalación</h2>
        <p :class="{ 'cabinet-warning': !dossier.installation.valid }">
          {{
            dossier.installation.valid
              ? "Instalación cerrada y válida"
              : dossier.installation.data
                ? "Datos guardados; instalación sin cierre válido vigente"
                : "Sin datos de instalación"
          }}
        </p>
        <p>
          Política histórica {{ dossier.installation.policyVersion }} · Cierre
          {{ text(dossier.installation.closureOperationId) }}
        </p>
        <template v-if="dossier.installation.data">
          <dl class="cabinet-fields">
            <div>
              <dt>Base de instalación</dt>
              <dd>{{ dossier.installation.data.baseId }}</dd>
            </div>
            <div>
              <dt>Cuenta de instalación</dt>
              <dd>{{ text(dossier.installation.data.accountNumber) }}</dd>
            </div>
            <div>
              <dt>Resolución de cuenta</dt>
              <dd>
                {{
                  label(dossier.installation.data.accountResolution?.decision)
                }}
                ·
                {{ text(dossier.installation.data.accountResolution?.reason) }}
              </dd>
            </div>
            <div>
              <dt>GPS de instalación (independiente de base/fotos)</dt>
              <dd>{{ gps(dossier.installation.data.gps) }}</dd>
            </div>
            <div>
              <dt>Observaciones</dt>
              <dd>{{ text(dossier.installation.data.observations) }}</dd>
            </div>
          </dl>
        </template>
        <h3>Checklist histórico congelado</h3>
        <details
          v-for="group in checklistGroups(dossier)"
          :key="group.name"
          open
        >
          <summary>
            {{ label(group.name) }} · {{ group.questions.length }} preguntas
          </summary>
          <article
            v-for="q in group.questions"
            :id="`question-${q.code}`"
            :key="q.code"
            class="cabinet-question"
          >
            <strong>{{ q.code }} · {{ q.label }}</strong>
            <p>
              {{ label(q.answer?.answer) }} · {{ label(q.applicability)
              }}<br>Razón: {{ text(q.answer?.reason) }} · Motivo pendiente:
              {{ label(q.answer?.pendingReason) }}<br>Clasificación
              registrada: {{ label(q.answer?.assessment) }}
            </p>
            <p v-if="q.answer?.impact">
              Impacto · Seguridad {{ presence(q.answer.impact.safety) }} ·
              Protección {{ presence(q.answer.impact.protection) }} · Función
              {{ presence(q.answer.impact.function) }}
            </p>
            <p v-if="q.capturedBy">
              {{ actor(q.capturedBy.actorId) }} · Captura
              {{ date(q.capturedBy.capturedAt) }} · Recepción
              {{ date(q.capturedBy.receivedAt) }}
            </p>
            <CabinetPending
              :items="q.pending"
              :dossier="dossier"
            /><a
              v-for="e in q.evidence"
              :key="e.photoId"
              class="btn"
              :href="`#photo-${e.photoId}`"
            >Ver evidencia {{ e.photoId }}</a>
          </article>
        </details>
        <details>
          <summary>
            Capturas y cierres históricos ({{
              dossier.installation.captures.length
            }})
          </summary>
          <CabinetTimeline :events="dossier.installation.captures" />
        </details>
      </section>
      <section
        id="final-review"
        class="card"
      >
        <h2>Revisión final</h2>
        <p>
          <strong>{{ label(dossier.finalReview.state) }}</strong>
        </p>
        <p
          v-if="dossier.finalReview.correction"
          class="cabinet-warning"
        >
          Corrección actual: {{ dossier.finalReview.correction.reason }}
        </p>
        <p v-if="dossier.finalReview.approval">
          {{
            dossier.finalReview.state === "approved"
              ? "Aprobación vigente"
              : "Referencia histórica de aprobación"
          }}
          · versión {{ dossier.finalReview.approval.version }} ·
          {{ dossier.finalReview.approval.operationId }}
        </p>
        <p
          v-if="dossier.finalReview.invalidations.length"
          class="cabinet-warning"
        >
          Existe aprobación histórica invalidada. No demuestra que el hidrante
          sea actualmente entregable.
        </p>
        <CabinetPending
          :items="dossier.finalReview.pending"
          :dossier="dossier"
        />
        <details>
          <summary>
            Intentos de revisión final ({{
              dossier.finalReview.attempts.length
            }})
          </summary>
          <CabinetTimeline :events="dossier.finalReview.attempts" />
        </details>
        <details>
          <summary>
            Invalidaciones ({{ dossier.finalReview.invalidations.length }})
          </summary>
          <CabinetTimeline :events="dossier.finalReview.invalidations" />
        </details>
      </section>
      <section
        id="photos"
        class="card"
      >
        <h2>Fotografías</h2>
        <p>
          Relaciones históricas e integridad verificada en vivo por el
          expediente, a la fecha indicada. Las rutas de miniatura/original
          verifican nuevamente al abrir el archivo.
        </p>
        <p v-if="!dossier.photos.length">
          Sin fotografías registradas.
        </p>
        <section
          v-for="group in photoGroups(dossier.photos)"
          :key="group.context"
        >
          <h3>{{ label(group.context) }}</h3>
          <div class="cabinet-gallery">
            <CabinetPhoto
              v-for="photo in group.items"
              :key="photo.photoId"
              :photo="photo"
              :relations="photoRelations(photo, dossier)"
            />
          </div>
        </section>
      </section>
      <section
        id="history"
        class="card"
      >
        <h2>Historial de capturas y recepción</h2>
        <CabinetTimeline :events="dossier.history" />
        <p>
          Versión servidor {{ dossier.synchronization.serverVersion }} ·
          {{ dossier.synchronization.receivedOperations }} operaciones
          recibidas.
        </p>
      </section>
    </template>
  </main>
</template>
