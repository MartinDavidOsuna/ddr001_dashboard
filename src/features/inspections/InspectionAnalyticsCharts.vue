<script setup lang="ts">
import { computed, ref } from 'vue';
import EChart from '@/components/EChart.vue';
import type { RvAnalyticsResponse, RvDistribution } from './rv-analytics.types';
import { availabilityCodes, availabilityChart, distributionChart, paretoChart, systemsChart, trendChart } from './rv-analytics.charts';
const props = defineProps<{ data: RvAnalyticsResponse }>();
function distributionLabel(d: RvDistribution) {
  const families: [string,string][] = [['flow_meter','Medidor'],['main_manual','Válvula principal'],['reg_sust_solenoid','Solenoide regulación'],['reg_sust','Regulación'],['sustaining','Piloto sostenedor'],['regulating','Piloto regulador'],['air_valve','Válvula de aire'],['injector_hydraulic','Válvula del inyector'],['injector_solenoid','Solenoide del inyector'],['injector_manual','Válvula manual del inyector'],['venturi','Venturi'],['user_manual','Válvula de usuario'],['filter_drain_solenoid','Solenoide de drenaje'],['filter_drain','Drenaje del filtro'],['filter','Filtro']];
  const family = families.find(([prefix]) => d.itemCode.startsWith(prefix))?.[1];
  return family ? family + ' · ' + d.label : d.label;
}
const selected = ref('RV-INV-flow_meter_brand');
const distribution = computed(() => props.data.distributions.find(d => d.code === selected.value) ?? props.data.distributions[0]);
const availability = computed(() => props.data.distributions.filter(d => availabilityCodes.includes(d.code)));
const pareto = computed(() => paretoChart(props.data));
const systems = computed(() => systemsChart(props.data));
const available = computed(() => availabilityChart(availability.value));
const inventory = computed(() => distribution.value ? distributionChart(distribution.value) : {});
const trend = computed(() => trendChart(props.data));
</script>
<template>
  <div class="rv-chart-grid">
    <section class="card rv-chart wide">
      <h2>Pareto de hallazgos</h2><p class="muted">
        Incidencias por indicador · Porcentaje acumulado en el detalle de cada barra.
      </p><EChart
        v-if="data.pareto.length"
        :option="pareto"
        :style="{height: `${Math.max(320,data.pareto.length * 58)}px`}"
        aria-label="Pareto de hallazgos, afectados, evaluados, incidencia y acumulado"
      /><p
        v-else
        class="empty-box"
      >
        Sin hallazgos registrados en este universo.
      </p><details v-if="data.pareto.length">
        <summary>Ver valores del Pareto</summary><ul>
          <li
            v-for="f in data.pareto"
            :key="f.code"
          >
            {{ f.label }}: {{ f.affected }} / {{ f.evaluated }} · {{ f.percentage }}% · Acumulado {{ f.cumulativePercentage }}% · No aplica {{ f.notApplicable }} · Sin dato {{ f.noData }}
          </li>
        </ul>
      </details>
    </section>
    <section class="card rv-chart">
      <h2>Hidrantes con hallazgos por sistema</h2><EChart
        v-if="data.systems.length"
        :option="systems"
        :style="{height:`${Math.max(360,data.systems.length*62)}px`}"
        aria-label="Hidrantes afectados por sistema"
      /><p
        v-else
        class="empty-box"
      >
        Sin sistemas evaluados.
      </p><p class="muted">
        Un hidrante puede presentar hallazgos en más de un sistema.
      </p><details>
        <summary>Ver valores por sistema</summary><ul>
          <li
            v-for="s in data.systems"
            :key="s.system"
          >
            {{ s.system }}: {{ s.hydrantsAffected }} / {{ s.hydrantsEvaluated }} hidrantes · {{ s.percentageAffected }}% · {{ s.findingCount }} hallazgos
          </li>
        </ul>
      </details>
    </section>
    <section class="card rv-chart">
      <h2>Disponibilidad de componentes</h2><EChart
        v-if="availability.some(d=>d.denominator>0)"
        :option="available"
        :style="{height:`${Math.max(400,availability.length*65)}px`}"
        aria-label="Presente, Ausente, No aplica y Sin dato por componente"
      /><p
        v-else
        class="empty-box"
      >
        Sin observaciones de disponibilidad.
      </p><p class="muted">
        No aplica y Sin dato no representan ausencia del componente.
      </p><details>
        <summary>Ver valores de disponibilidad</summary><ul>
          <li
            v-for="d in availability"
            :key="d.code"
          >
            {{ d.label }}: <span
              v-for="v in d.values"
              :key="v.key"
            >{{ v.key==='true'?'Presente':v.key==='false'?'Ausente':v.label }} {{ v.count }} ({{ v.percentage }}%) · </span>
          </li>
        </ul>
      </details>
    </section>
    <section class="card rv-chart">
      <h2>Características observadas</h2><label class="distribution-label">Distribución a visualizar<select v-model="selected"><option
        v-for="d in data.distributions"
        :key="d.code"
        :value="d.code"
      >{{ distributionLabel(d) }}</option></select></label><EChart
        v-if="distribution?.values.length"
        :option="inventory"
        :style="{height:`${Math.max(320,distribution.values.length*55)}px`}"
        :aria-label="distribution.label"
      /><p
        v-else
        class="empty-box"
      >
        Sin datos para esta distribución.
      </p><details v-if="distribution?.values.length">
        <summary>Ver valores de distribución</summary><ul>
          <li
            v-for="v in distribution.values"
            :key="v.key"
          >
            {{ v.label }}: {{ v.count }} / {{ distribution.denominator }} · {{ v.percentage }}%
          </li>
        </ul>
      </details>
    </section>
    <section class="card rv-chart">
      <h2>Evolución de hallazgos observados</h2><p class="muted">
        Inspecciones por fecha de inicio local. {{ data.scope.mode==='current'?'Cohorte del estado actual; no representa transiciones.':'Histórico de revisiones.' }}
      </p><EChart
        v-if="data.trend.length"
        :option="trend"
        style="height:340px"
        aria-label="Evolución de inspecciones evaluadas y con hallazgos"
      /><p
        v-else
        class="empty-box"
      >
        Sin observaciones temporales.
      </p><details v-if="data.trend.length">
        <summary>Ver valores de evolución</summary><ul>
          <li
            v-for="p in data.trend"
            :key="p.date"
          >
            {{ p.date }}: {{ p.evaluated }} evaluadas · {{ p.affected }} con hallazgos · {{ p.percentageAffected }}%
          </li>
        </ul>
      </details>
    </section>
  </div>
</template>
<style scoped>
.rv-chart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.rv-chart{padding:20px;min-width:0}.wide{grid-column:1/-1}.rv-chart h2{font-size:1.08rem;margin:0 0 12px}.rv-chart p{font-size:.8rem}.distribution-label{display:grid;gap:8px;font-size:.8rem}.distribution-label select{width:100%;min-width:0}details{font-size:.8rem;margin-top:12px}summary{cursor:pointer}li{margin:8px 0;overflow-wrap:anywhere}@media(max-width:1000px){.rv-chart-grid{grid-template-columns:1fr}}@media(max-width:480px){.rv-chart{padding:12px}}
</style>
