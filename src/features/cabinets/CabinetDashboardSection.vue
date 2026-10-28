<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed, watch } from "vue";
import EChart from "@/components/EChart.vue";
import { cabinetsApi, type CabinetParams } from "./cabinets.api";
import { useCabinetResource } from "./cabinets.resource";
import type {
  CabinetAdminSummary,
  CabinetAdminMetrics,
} from "./cabinets.generated";
import {
  modelChart,
  stateChart,
  variantChart,
  activityChart,
} from "./cabinets.charts";
import { cycle, date } from "./cabinets.format";
import "./cabinets.css";
const route = useRoute();
const props = withDefaults(
  defineProps<{ filters?: CabinetParams; compact?: boolean }>(),
  { filters: () => ({}) },
);
const summary = useCabinetResource<CabinetAdminSummary>(),
  metrics = useCabinetResource<CabinetAdminMetrics>();
function loadSummary() { void summary.load((signal) => cabinetsApi.summary(props.filters, signal)); }
function loadMetrics() { void metrics.load((signal) => cabinetsApi.metrics(props.filters, signal)); }
function load() { loadSummary(); loadMetrics(); }
watch(() => props.filters, load, { immediate: true, deep: true });
const missing = computed(() => [...(metrics.data.value?.missingParts ?? [])].sort((a,b) => b.missingUnits - a.missingUnits));
const kpis = computed(() => {
  const s = summary.data.value;
  if (!s) return [];
  const values = [
    ["Registro alcanzado · hito", s.registeredMilestone],
    ["Instalación válida · hito", s.installedMilestone],
    ["Hidrantes entregables · actual", s.deliverable],
    ["Incompletos · actual", s.incomplete],
    ["Estándar", s.standard],
    ["Automatizado", s.automated],
  ];
  return props.compact
    ? values
    : [
        ...values,
        ["Registrados · estado actual", s.registered],
        ["Validados · estado actual", s.validated],
        ["Instalados · estado actual", s.installed],
        ["Pendientes de revisión final", s.pendingFinalReview],
        ["Instalados sin cuenta", s.installedWithoutAccount],
        ["Borradores técnicos", s.draft],
      ];
});
</script>
<template>
  <section
    class="cabinets cabinet-stack"
    aria-label="Indicadores de Nuevos Hidrantes"
  >
    <header class="cabinet-head">
      <div>
        <small class="cabinet-eyebrow">LEVANTAMIENTOS / NUEVOS HIDRANTES</small>
        <h2>Nuevos Hidrantes</h2>
        <p>
          Gabinetes y avance de instalación. Entregable no significa entrega
          formal.
        </p>
      </div>
      <RouterLink
        v-if="compact"
        class="btn"
        to="/levantamientos/nuevos-hidrantes"
      >
        Abrir Nuevos Hidrantes
      </RouterLink>
    </header>
    <p
      v-if="summary.loading.value"
      role="status"
      class="card cabinet-loading"
    >
      Cargando indicadores…
    </p>
    <div
      v-else-if="summary.error.value"
      role="alert"
      class="cabinet-error"
    >
      {{ summary.error.value }}
      <button
        class="btn"
        @click="loadSummary"
      >
        Reintentar indicadores
      </button>
    </div>
    <template v-if="summary.data.value">
      <div class="card cabinet-progress">
        <h3>AVANCE DE PRODUCCIÓN</h3>
        <strong>{{ summary.data.value.produced }} /
          {{ summary.data.value.productionTarget }}</strong><span>Producidos / objetivo ·
          {{ summary.data.value.productionPercent }}%</span><progress
          :max="summary.data.value.productionTarget || 1"
          :value="summary.data.value.produced"
          aria-label="Avance de producción"
        /><small>Instalación válida {{ summary.data.value.installedPercent }}% ·
          Entregables {{ summary.data.value.deliverablePercent }}%</small>
      </div>
      <div class="cabinet-kpis">
        <article
          v-for="[name, value] in kpis"
          :key="String(name)"
          class="card"
        >
          <small>{{ name }}</small><strong>{{ value }}</strong>
        </article>
      </div>
      <details
        v-if="!compact"
        class="card"
      >
        <summary>Evidencia e integridad · último chequeo almacenado</summary>
        <p>
          {{ summary.data.value.photoCount }} fotografías ·
          {{ summary.data.value.relationConfirmedEvidenceCount }} relaciones
          confirmadas (no garantizan integridad actual).
        </p>
        <div class="cabinet-kpis">
          <article>
            <small>Confirmadas al último chequeo</small><strong>{{
              summary.data.value.storageConfirmedAtLastCheck
            }}</strong>
          </article>
          <article>
            <small>Problemas al último chequeo</small><strong>{{ summary.data.value.problemsAtLastCheck }}</strong>
          </article>
          <article>
            <small>Faltantes al último chequeo</small><strong>{{ summary.data.value.missingAtLastCheck }}</strong>
          </article>
          <article>
            <small>Desconocidas</small><strong>{{ summary.data.value.integrityUnknownCount }}</strong>
          </article>
        </div>
        <p>Chequeo más antiguo: {{ date(summary.data.value.oldestCheckAt) }}</p>
        <p>
          Corrección requerida: {{ summary.data.value.correctionRequired }} ·
          Pruebas pendientes: {{ summary.data.value.testsPending }} ·
          Aprobaciones invalidadas:
          {{ summary.data.value.invalidatedApprovals }}. Estos indicadores
          pueden coincidir.
        </p>
      </details>
    </template>
    <p
      v-if="metrics.loading.value"
      role="status"
    >
      Cargando gráficas…
    </p>
    <div
      v-else-if="metrics.error.value"
      role="alert"
      class="cabinet-error"
    >
      {{ metrics.error.value }}
      <button
        class="btn"
        @click="loadMetrics"
      >
        Reintentar gráficas
      </button>
    </div>
    <template v-if="metrics.data.value">
      <div
        class="cabinet-kpis"
        aria-label="Producción por modelo"
      >
        <article
          v-for="m in metrics.data.value.models"
          :key="m.model"
          class="card cabinet-progress"
        >
          <h3>{{ m.model }}</h3><strong>{{ m.produced }} / {{ m.productionTarget }}</strong>
          <span>{{ m.productionPercent }}% · {{ m.remainingToProduce }} por producir</span>
          <progress
            :value="m.produced"
            :max="m.productionTarget || 1"
            :aria-label="`Producción ${m.model}`"
          />
        </article>
      </div>
      <section class="card">
        <h3>PIEZAS FALTANTES</h3>
        <p>Unidades ausentes o sin revisar. Series y evidencia pendientes se consultan por separado en el expediente.</p>
        <div class="cabinet-scroll">
          <table class="cabinet-table">
            <thead><tr><th>Pieza</th><th>Modelo</th><th>Unidades faltantes</th><th>Gabinetes afectados</th><th>Ausencia confirmada</th><th>Sin revisar</th></tr></thead>
            <tbody>
              <tr
                v-for="p in missing"
                :key="`${p.partCode}-${p.automated}`"
              >
                <td data-label="Pieza">
                  <RouterLink :to="{path:'/levantamientos/nuevos-hidrantes',query:{...route?.query,missingPartCode:p.partCode,missingPartName:p.displayName,model:p.model,automated:String(p.automated),page:'1'}}">
                    {{ p.displayName }}
                  </RouterLink>
                </td>
                <td data-label="Modelo">
                  {{ p.model }}{{ p.automated ? '-A' : '' }}
                </td>
                <td data-label="Unidades faltantes">
                  {{ p.missingUnits }}
                </td><td data-label="Gabinetes afectados">
                  {{ p.affectedCabinets }}
                </td>
                <td data-label="Ausencia confirmada">
                  {{ p.confirmedAbsentUnits }}
                </td><td data-label="Sin revisar">
                  {{ p.notReviewedUnits }}
                </td>
              </tr>
            </tbody>
          </table>
        </div><p v-if="!missing.length">
          Sin piezas faltantes para estos filtros.
        </p>
      </section>
      <div
        class="cabinet-charts"
        :class="{ compact }"
      >
        <article class="card">
          <h3>Avance por modelo</h3>
          <EChart
            :option="modelChart(metrics.data.value)"
            aria-label="Meta y avance por modelo"
          />
          <div class="cabinet-scroll">
            <table>
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Meta</th>
                  <th>Registro alcanzado</th>
                  <th>Instalación válida</th>
                  <th>Entregables</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in metrics.data.value.models"
                  :key="m.model"
                >
                  <td>{{ m.model }}</td>
                  <td>{{ m.target }}</td>
                  <td>{{ m.registeredMilestone }}</td>
                  <td>{{ m.installedMilestone }}</td>
                  <td>{{ m.deliverable }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
        <article
          v-if="!compact"
          class="card"
        >
          <h3>Distribución por estado actual</h3>
          <p>
            Borradores técnicos separados:
            {{
              metrics.data.value.states.find((s) => s.status === "draft")
                ?.total ?? 0
            }}.
          </p>
          <EChart
            :option="stateChart(metrics.data.value)"
            aria-label="Estados actuales"
          />
        </article>
        <article
          v-if="!compact"
          class="card"
        >
          <h3>Estándar / Automatizado por estado</h3>
          <p>Sin meta por variante.</p>
          <EChart
            :option="variantChart(metrics.data.value)"
            aria-label="Variantes por estado"
          />
        </article>
        <article
          v-if="!compact"
          class="card"
        >
          <h3>Actividad por fecha del evento · UTC</h3>
          <p>
            Operaciones exitosas; incluye cierres y revisiones repetidos. No
            corresponde a la fecha de registro del listado.
          </p>
          <EChart
            :option="activityChart(metrics.data.value)"
            aria-label="Actividad temporal"
          />
        </article>
      </div>
      <template v-if="!compact">
        <section class="card">
          <h3>Avance por empresa</h3>
          <p>
            Empresa de registro conservada en el expediente; para datos históricos
            sin atribución se utiliza la empresa de la base vinculada.
          </p>
          <div class="cabinet-scroll">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Total</th>
                  <th>Incompletos</th>
                  <th>Validados</th>
                  <th>Instalados</th>
                  <th>Entregables</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in metrics.data.value.companies"
                  :key="c.crewId || 'none'"
                >
                  <td>{{ c.crewName || "Sin empresa / Sin asignación" }}</td>
                  <td>{{ c.total }}</td>
                  <td>{{ c.incomplete }}</td>
                  <td>{{ c.validated }}</td>
                  <td>{{ c.installed }}</td>
                  <td>{{ c.deliverable }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!metrics.data.value.companies.length">
            Sin empresas para estos filtros.
          </p>
        </section>
        <section class="card">
          <h3>Ciclos promedio de eventos válidos</h3>
          <div class="cabinet-kpis">
            <article>
              <small>Registro → Validación ({{
                metrics.data.value.cycle.validationPairs
              }}
                pares)</small><strong>{{
                cycle(metrics.data.value.cycle.registrationToValidationSeconds)
              }}</strong>
            </article>
            <article>
              <small>Validación → Instalación ({{
                metrics.data.value.cycle.installationPairs
              }}
                pares)</small><strong>{{
                cycle(metrics.data.value.cycle.validationToInstallationSeconds)
              }}</strong>
            </article>
            <article>
              <small>Instalación → Aprobación final ({{
                metrics.data.value.cycle.approvalPairs
              }}
                pares)</small><strong>{{
                cycle(metrics.data.value.cycle.installationToApprovalSeconds)
              }}</strong>
            </article>
          </div>
          <p>
            Basados en timestamps de captura Field; no certifican tiempo físico
            de trabajo.
          </p>
        </section>
        <section class="card">
          <h3>Incompletos por modelo y variante</h3>
          <ul>
            <li
              v-for="i in metrics.data.value.incomplete"
              :key="`${i.model}-${i.automated}`"
            >
              {{ i.model }} · {{ i.automated ? "Automatizado" : "Estándar" }}:
              {{ i.total }}
            </li>
          </ul>
          <p v-if="!metrics.data.value.incomplete.length">
            Sin gabinetes incompletos para estos filtros.
          </p>
        </section>
      </template>
    </template>
  </section>
</template>
