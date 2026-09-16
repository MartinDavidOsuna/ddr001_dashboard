<script setup lang="ts">
import { computed } from "vue";
import type { Sample } from "./diagnostics.types";
import { hasValue } from "./diagnostics.format";
import DiagnosticBadge from "./DiagnosticBadge.vue";
import DiagnosticFields from "./DiagnosticFields.vue";
import DiagnosticEvidenceThumbnail from "./DiagnosticEvidenceThumbnail.vue";
const props = defineProps<{ caseId: string; sample: Sample }>();
const groups: Array<{ title: string; keys: string[] }> = [
  {
    title: "Bluetooth / ESP32",
    keys: [
      "bleDeviceId",
      "bleDeviceName",
      "bleServiceUuid",
      "bleCounterCharacteristicUuid",
      "bleProtocolVersion",
      "esp32CounterAtStart",
      "lastObservedEsp32Counter",
      "litersPerPulse",
    ],
  },
  {
    title: "Configuración de prueba",
    keys: [
      "litersPerPulse",
      "evidenceStepL",
      "readingUncertaintyL",
      "flowPointCode",
      "configuredMpePct",
      "lpsApprox",
      "litersPerOdometerUnit",
      "needleLitersPerRevolution",
      "minimumVolumeL",
      "maximumVolumeL",
      "controlStartMinimumLps",
      "controlStartMaximumLps",
      "hydrantLitersPerPulse",
    ],
  },
  {
    title: "Totalizador",
    keys: [
      "totalizerLeft",
      "totalizerTop",
      "totalizerWidth",
      "totalizerHeight",
      "totalizerDigitCount",
      "totalizerDecimalPlaces",
      "totalizerUnit",
      "totalizerLeadingZerosAllowed",
      "totalizerConfigurationSource",
    ],
  },
  {
    title: "Dial",
    keys: [
      "dialCenterX",
      "dialCenterY",
      "dialRadius",
      "dialMultiplier",
      "dialLitersPerRevolution",
      "dialZeroAngleDegrees",
      "dialClockwise",
      "dialConfigurationSource",
    ],
  },
  { title: "Cámara", keys: ["cameraZoomLevel"] },
  {
    title: "Sensor LED",
    keys: [
      "ledRoiLeft",
      "ledRoiTop",
      "ledRoiWidth",
      "ledRoiHeight",
      "ledRisingDelta",
      "ledFallingDelta",
      "ledBaseline",
      "ledMinPulseIntervalMs",
      "ledUsesBleReconciliation",
    ],
  },
];
const settings = computed(() =>
  groups
    .map((g) => ({
      ...g,
      value: Object.fromEntries(
        g.keys
          .filter((k) => hasValue(props.sample.operationalSettings?.[k]))
          .map((k) => [k, props.sample.operationalSettings?.[k]]),
      ),
    }))
    .filter(
      (g) =>
        Object.keys(g.value).length &&
        (g.title !== "Bluetooth / ESP32" ||
          props.sample.measurementSource === "BLE" ||
          Object.keys(g.value).some(
            (k) => k.startsWith("ble") || k.includes("Counter"),
          )),
    ),
);
const metadata = computed(() =>
  Object.fromEntries(
    Object.entries(props.sample).filter(
      ([key]) => !["points", "evidence", "operationalSettings"].includes(key),
    ),
  ),
);
const resultFields = [
  ["pulseCount", "Pulsos recibidos"],
  ["progressReferenceL", "Volumen patrón de progreso (L)"],
  ["vRefL", "Volumen patrón (L)"],
  ["vIndL", "Volumen indicado (L)"],
  ["errorPct", "Error (%)"],
  ["uncertaintyPct", "Incertidumbre (%)"],
  ["resultMpePct", "MPE (%)"],
  ["acceptanceMetricPct", "Métrica de aceptación (%)"],
  ["rejectionMetricPct", "Métrica de rechazo (%)"],
] as const;
</script>
<template>
  <article class="diag-sample">
    <div class="diag-head">
      <h3>Muestra {{ sample.sampleNumber }}</h3>
      <div class="diag-actions">
        <DiagnosticBadge :value="sample.measurementSource" /><DiagnosticBadge
          v-if="
            sample.isSimulation && sample.measurementSource !== 'SIMULATION'
          "
          value="SIMULATION"
        /><DiagnosticBadge :value="sample.status" /><DiagnosticBadge
          :value="sample.verdict"
        />
      </div>
    </div>
    <p v-if="sample.isSimulation" class="diag-note">
      SIMULACIÓN · Escenario: {{ sample.simulationScenario }}. No corresponde a
      una prueba física.
    </p>
    <div
      v-if="sample.acquisitionIntegrityStatus === 'COMPROMISED'"
      class="diag-alert"
      role="alert"
    >
      Integridad de adquisición comprometida:
      {{ sample.acquisitionIntegrityReason }}
    </div>
    <section>
      <h3>Resultados metrológicos</h3>
      <DiagnosticFields :value="sample" :fields="resultFields" />
    </section>
    <section>
      <h3>Lecturas y tiempos</h3>
      <DiagnosticFields
        :value="sample"
        :fields="[
          ['startedAt', 'Inicio'],
          ['endedAt', 'Fin'],
          ['initialOdometerUnits', 'Totalizador inicial (unidades)'],
          ['initialNeedleL', 'Aguja inicial (L)'],
          ['initialReadingSource', 'Fuente inicial'],
          ['initialEvidenceId', 'Evidencia inicial'],
          ['finalOdometerUnits', 'Totalizador final (unidades)'],
          ['finalNeedleL', 'Aguja final (L)'],
          ['finalReadingSource', 'Fuente final'],
          ['finalEvidenceId', 'Evidencia final'],
        ]"
      />
    </section>
    <section>
      <h3>Integridad de adquisición</h3>
      <DiagnosticBadge
        :value="sample.acquisitionIntegrityStatus"
      /><DiagnosticFields
        :value="sample"
        :fields="[
          ['acquisitionIntegrityReason', 'Motivo'],
          ['acquisitionIntegrityAt', 'Fecha'],
          ['acquisitionIntegritySource', 'Fuente'],
        ]"
      />
    </section>
    <section v-for="g in settings" :key="g.title">
      <h3>{{ g.title }}</h3>
      <DiagnosticFields :value="g.value" />
    </section>
    <section v-if="sample.gpsLatitude != null && sample.gpsLongitude != null">
      <h3>GPS</h3>
      <DiagnosticFields
        :value="sample"
        :fields="[
          ['gpsLatitude', 'Latitud'],
          ['gpsLongitude', 'Longitud'],
          ['gpsAccuracyM', 'Precisión (m)'],
          ['gpsCapturedAt', 'Capturada'],
        ]"
      />
    </section>
    <section>
      <h3>Puntos de medición</h3>
      <p v-if="!sample.points.length">Sin puntos registrados.</p>
      <div v-else class="diag-scroll">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Datos de medición</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in sample.points" :key="point.pointId">
              <td><DiagnosticBadge :value="point.type" /></td>
              <td>
                <DiagnosticFields
                  :value="point"
                  :fields="[
                    ['capturedAt', 'Fecha'],
                    ['pulseCount', 'Pulsos patrón'],
                    ['meterUnderTestPulseCount', 'Pulsos del medidor'],
                    ['vRefL', 'Volumen patrón (L)'],
                    ['readingL', 'Lectura (L)'],
                    ['vIndL', 'Volumen indicado (L)'],
                    ['diagnosticErrorPct', 'Error diagnóstico (%)'],
                    ['needleL', 'Aguja (L)'],
                    ['flowLps', 'Caudal (L/s)'],
                  ]"
                />
                <details>
                  <summary>Metadatos del punto</summary>
                  <DiagnosticFields :value="point" />
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section>
      <h3>Evidencias</h3>
      <p v-if="!sample.evidence.length">
        Sin evidencias vinculadas a esta muestra.
      </p>
      <div class="diag-evidence-grid">
        <DiagnosticEvidenceThumbnail
          v-for="e in sample.evidence"
          :key="e.evidenceId"
          :case-id="caseId"
          :evidence="e"
        />
      </div>
    </section>
    <details>
      <summary>Metadatos técnicos de la muestra</summary>
      <DiagnosticFields :value="metadata" />
      <details v-if="sample.operationalSettings">
        <summary>Configuración completa recibida</summary>
        <DiagnosticFields :value="sample.operationalSettings" />
      </details>
    </details>
  </article>
</template>
