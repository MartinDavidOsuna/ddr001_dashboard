<script setup lang="ts">
import { computed } from 'vue';
import type { RvDataQuality, RvParcelValveAnalytics, RvAnalyticsMetric } from './rv-analytics.types';
const props = defineProps<{ quality: RvDataQuality; parcel: RvParcelValveAnalytics; findings: RvAnalyticsMetric[] }>();
const metrics = computed(() => [
 ['Evidencia obligatoria completa', props.quality.requiredEvidence.complete], ['Evidencia incompleta', props.quality.requiredEvidence.incomplete],
 ['Evidencia indeterminada', props.quality.requiredEvidence.indeterminate], ['Evidencia base completa', props.quality.requiredEvidence.baseComplete],
 ['Evidencia base incompleta', props.quality.requiredEvidence.baseIncomplete], ['Sin GPS',props.quality.withoutGps],['Sin señal',props.quality.withoutSignal],
 ['Campos aplicables obligatorios sin dato',props.quality.applicableRequiredFieldsWithoutData],['Observaciones de indicadores sin dato',props.quality.missingIndicatorObservations],
 ['Revisiones Ausentes',props.quality.inactiveInspections],
]);
const components = computed(() => [['Componentes observados',props.parcel.components.observedValves],['Componentes sin solenoide',props.parcel.components.withoutSolenoid],['Componentes sin piloto',props.parcel.components.withoutPilot],['Componentes sin manómetro',props.parcel.components.withoutGauge],['Pilotos desconectados',props.parcel.components.disconnectedPilots]]);
const parcelFindings = computed(() => props.findings.filter(f => f.code.startsWith('RV-PAR-')));
</script>
<template>
  <section class="card quality">
    <h2>Calidad de la información RV</h2><p class="muted">
      Conteos de captura y evidencia; no son fallas físicas. GPS y señal indican existencia de una muestra.
    </p><div class="quality-grid">
      <article
        v-for="[label,value] in metrics"
        :key="String(label)"
      >
        <span>{{ label }}</span><strong>{{ value }}</strong>
      </article><article
        v-for="m in quality.indicators"
        :key="m.code"
      >
        <span>{{ m.label }}</span><strong>{{ m.affected }}</strong><small>{{ m.affected }} / {{ m.evaluated }} · {{ m.percentage }}% · No aplica {{ m.notApplicable }} · Sin dato {{ m.noData }}</small>
      </article>
    </div>
    <details>
      <summary>Verificación e integridad fotográfica registrada</summary><p class="muted">
        Verificación de carga y hash no certifica disponibilidad del archivo en tiempo real. Los estados siguientes proceden de la API.
      </p><ul>
        <li
          v-for="(p,i) in quality.photoIntegrity"
          :key="i"
        >
          {{ p.integrityVerified?'Carga/hash verificados':'Carga/hash sin verificar' }} · Carga: {{ p.uploadStatus }} · Integridad: {{ p.integrityStatus || 'Sin dato' }} · Asociación: {{ p.mappingStatus || 'Sin dato' }}: <b>{{ p.count }} fotografías</b>
        </li>
      </ul><p v-if="!quality.photoIntegrity.length">
        Sin fotografías en el universo seleccionado.
      </p>
    </details>
  </section>
  <section class="card quality">
    <h2>Válvulas parcelarias</h2><template v-if="parcel.components.observedValves || parcel.configurations.length || parcelFindings.some(f => f.evaluated > 0)">
      <h3>{{ findings[0]?.unit==='inspections'?'Inspecciones afectadas':'Hidrantes afectados' }}</h3><div class="quality-grid">
        <article
          v-for="f in parcelFindings"
          :key="f.code"
        >
          <span>{{ f.label }}</span><strong>{{ f.affected }}</strong><small>{{ f.affected }} / {{ f.evaluated }} · {{ f.percentage }}% · No aplica {{ f.notApplicable }} · Sin dato {{ f.noData }}</small>
        </article>
      </div><h3>Componentes afectados</h3><div class="quality-grid">
        <article
          v-for="[label,value] in components"
          :key="String(label)"
        >
          <span>{{ label }}</span><strong>{{ value }}</strong>
        </article>
      </div><h3>Configuraciones observadas</h3><ul>
        <li
          v-for="c in parcel.configurations"
          :key="c.key"
        >
          {{ c.key }}: {{ c.count }} observaciones · {{ c.configuredValves }} válvulas declaradas
        </li>
      </ul><details>
        <summary>Inventario por componente</summary><div
          v-for="d in parcel.distributions"
          :key="d.code"
        >
          <h4>{{ {parcel_brand:'Marcas',parcel_diameter:'Diámetros',parcel_pressure_range:'Rangos de presión'}[d.code] || d.code }}</h4><ul>
            <li
              v-for="v in d.values"
              :key="v.key"
            >
              {{ v.key==='SIN_DATO'?'Sin dato':v.key==='NO_APLICA'?'No aplica':v.key }}: {{ v.count }} / {{ d.denominator }} componentes · {{ v.percentage }}%
            </li>
          </ul>
        </div>
      </details>
    </template><p
      v-else
      class="empty-box"
    >
      Sin configuración ni componentes parcelarios observados.
    </p><p class="muted">
      Los componentes y las observaciones de configuración tienen unidades distintas de los hidrantes. Una respuesta genérica histórica no permite contar componentes individuales.
    </p>
  </section>
</template>
<style scoped>.quality{padding:20px}.quality h2{margin:0 0 10px;font-size:1.1rem}.quality h3{font-size:.95rem}.quality p,details,li{font-size:.8rem}.quality-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:18px 0}.quality-grid article{padding:14px;background:#f5f8fb;border-radius:8px;display:grid;gap:8px}.quality-grid span,.quality-grid small{font-size:.8rem;color:#52647d}.quality-grid strong{font-size:1.6rem}summary{cursor:pointer}li{margin:8px 0;overflow-wrap:anywhere}</style>
