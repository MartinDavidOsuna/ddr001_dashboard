<script setup lang="ts">
import {computed,onBeforeUnmount,ref,watch} from 'vue';
import {useRoute} from 'vue-router';
import {problemMessage} from '@/api/client';
import EChart from '@/components/EChart.vue';
import {hydroApi,type Attempt,type Summary,type Metrics,type Filters} from './hydrostatic.api';
import {bar,cleanFilters,date,duration,label,number} from './hydrostatic.format';
import './hydrostatic.css';
const metricHeading=(key:string)=>({id:'Identificador',name:'Operador',model:'Modelo',uid:'UID',attempts:'Intentos',averageDurationMs:'Duración promedio',firstPassAt:'Primer aprobado declarado',attemptsToFirstPass:'Intentos hasta aprobado',day:'Fecha de ejecución',passed:'Aprobados declarados',leaks:'Fugas',discarded:'Descartadas'} as Record<string,string>)[key]??key;
const route=useRoute(),items=ref<Attempt[]>([]),summary=ref<Summary>(),metrics=ref<Metrics>(),error=ref(''),loading=ref(false),total=ref(0),page=ref(1),metricPage=ref(1);
const filters=ref<Filters>({uid:'',cabinetId:'',model:'',operatorId:'',from:'',to:'',result:'',discarded:'include',evidence:'',review:'',population:'operational',sort:'startedAt',direction:'desc'});
const cabinet=computed(()=>String(route.params.cabinetId??''));let controller:AbortController|undefined,request=0;
function query(){const f=cleanFilters(filters.value);for(const k of ['from','to'])if(f[k])f[k]=new Date(String(f[k])+(k==='to'?'T23:59:59.999':'T00:00:00')).toISOString();return f;}
async function load(reset=false){if(reset){page.value=1;metricPage.value=1;}controller?.abort();controller=new AbortController();const current=++request;loading.value=true;error.value='';items.value=[];summary.value=undefined;metrics.value=undefined;try{const q=query(),signal=controller.signal;if(cabinet.value)q.cabinetId=cabinet.value;const [list,s,m]=await Promise.all([cabinet.value?hydroApi.cabinet(cabinet.value,{...q,page:page.value},signal):hydroApi.list({...q,page:page.value},signal),hydroApi.summary(q,signal),hydroApi.metrics({...q,page:metricPage.value},signal)]);if(current===request){items.value=list.items;total.value=list.total??0;summary.value=s;metrics.value=m;}}catch(e){if(current===request)error.value=problemMessage(e,'No se pudieron consultar las pruebas hidrostáticas.');}finally{if(current===request)loading.value=false;}}
watch(()=>route.fullPath,()=>{filters.value.population=cabinet.value?'all':'operational';filters.value.direction=cabinet.value?'asc':'desc';void load(true);},{immediate:true});onBeforeUnmount(()=>{request++;controller?.abort();});
const cards=computed(()=>{const s=summary.value;return s?[['Gabinetes iniciados',s.cabinets],['Intentos iniciados',s.attempts],['Último APROBADO declarado',s.latestPass],['Última FUGA',s.latestLeak],['DESCARTADAS',s.discarded],['Pendientes de resultado',s.pending],['Intentos por gabinete',number(s.averageAttempts)],['Primero observado APROBADO',number(s.firstAttemptPassPercent)+' %'],['Evidencias pendientes',s.evidencePending],['Con fotos verificadas',s.withVerifiedPhotos],['Requieren revisión',s.requiresReview],['Duración promedio',duration(s.averageDurationMs)]]:[];});
const jointChart=computed(()=>({animation:false,tooltip:{trigger:'axis'},xAxis:{type:'category',data:metrics.value?.joints.map(j=>j.code)??[]},yAxis:{type:'value',minInterval:1,name:'Eventos'},series:[{type:'bar',data:metrics.value?.joints.map(j=>j.events)??[],itemStyle:{color:'#b45309'}}]}));
const trendChart=computed(()=>({animation:false,tooltip:{trigger:'axis'},legend:{data:['APROBADO declarado','FUGA']},xAxis:{type:'category',data:metrics.value?.daily.map(d=>d.day)??[]},yAxis:{type:'value',minInterval:1,name:'Intentos'},series:[{type:'line',name:'APROBADO declarado',data:metrics.value?.daily.map(d=>d.passed)??[]},{type:'line',name:'FUGA',data:metrics.value?.daily.map(d=>d.leaks)??[]}]}));
</script>
<template>
  <main class="content hydro">
    <RouterLink to="/levantamientos/nuevos-hidrantes">
      ← Nuevos Hidrantes
    </RouterLink><header><h1>Pruebas Hidrostáticas</h1><p>{{ cabinet?'Expediente por gabinete · todos sus intentos':'Consulta administrativa global' }}. Resultados declarados en campo, sin certificación hidráulica automática.</p></header>
    <form
      class="card hydro-filters"
      @submit.prevent="load(true)"
    >
      <label>UID<input v-model="filters.uid"></label><label v-if="!cabinet">Gabinete UUID<input v-model="filters.cabinetId"></label><label>Modelo<select v-model="filters.model"><option value="">Todos</option><option
        v-for="m in ['A1','A2','A3','A4']"
        :key="m"
      >{{ m }}</option></select></label><label>Operador UUID<input v-model="filters.operatorId"></label><label>Inicio desde<input
        v-model="filters.from"
        type="date"
      ></label><label>Inicio hasta<input
        v-model="filters.to"
        type="date"
      ></label><label>Resultado<select v-model="filters.result"><option value="">Todos</option><option
        v-for="r in ['PASS','LEAK','PENDING','DISCARDED']"
        :key="r"
        :value="r"
      >{{ label(r) }}</option></select></label><label>Descartadas<select v-model="filters.discarded"><option value="include">Incluir</option><option value="exclude">Excluir</option><option value="only">Solo descartadas</option></select></label><label>Evidencia<select v-model="filters.evidence"><option value="">Todas</option><option value="pending">Pendiente</option><option value="verified">Todas verificadas</option><option value="error">Error</option></select></label><label>Revisión<select v-model="filters.review"><option value="">Todas</option><option value="true">Necesaria</option><option value="false">Sin revisión</option></select></label><label>Población<select v-model="filters.population"><option value="operational">Operativa clasificada</option><option value="synthetic">Sintética identificada</option><option value="unclassified">Sin clasificación</option><option value="all">Historial técnico completo</option></select></label><label>Orden<select v-model="filters.sort"><option value="startedAt">Inicio</option><option value="uid">UID</option><option value="result">Resultado</option><option value="duration">Duración</option></select></label><label>Dirección<select v-model="filters.direction"><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label><button
        class="btn"
        :disabled="loading"
      >
        Aplicar filtros
      </button>
    </form>
    <p
      v-if="loading"
      role="status"
    >
      Consultando…
    </p><p
      v-if="error"
      role="alert"
      class="card"
    >
      {{ error }} <button
        class="btn"
        @click="load()"
      >
        Reintentar
      </button>
    </p>
    <template v-if="summary">
      <p class="card">
        {{ summary.classificationWarning }}<br>Cobertura de clasificación antes del filtro de población: <span
          v-for="c in summary.coverage"
          :key="c.classification"
        >{{ label(c.classification) }}: {{ c.count }}. </span>
      </p><section
        class="hydro-cards"
        aria-label="Resumen"
      >
        <article
          v-for="[title,value] in cards"
          :key="String(title)"
          class="card"
        >
          <span>{{ title }}</span><strong>{{ value }}</strong>
        </article>
      </section><details class="card">
        <summary>Definiciones y denominadores</summary><p
          v-for="(v,k) in summary.definitions"
          :key="k"
        >
          {{ v }}
        </p><p>Primer intento observado: {{ summary.firstAttemptPass }} / {{ summary.firstAttemptDenominator }} gabinetes. Fugas: {{ summary.leakAttempts }} / {{ summary.completedResults }} resultados terminados ({{ number(summary.leakPercent) }} %). Los números locales de intento no son consecutivos globales.</p>
      </details>
    </template>
    <section
      v-if="metrics"
      class="card"
    >
      <h2>Fugas por unión</h2><div class="hydro-chart">
        <EChart
          :option="jointChart"
          aria-label="Eventos de fuga por unión J01 a J11"
        />
      </div><div class="hydro-scroll">
        <table>
          <caption>Observaciones de unión; múltiples uniones pueden pertenecer a un mismo intento</caption><thead><tr><th>Unión</th><th>Eventos</th><th>Intentos afectados</th><th>Presión media</th><th>Moda (incluye empates)</th></tr></thead><tbody>
            <tr
              v-for="j in metrics.joints"
              :key="j.code"
            >
              <td>{{ j.code }} · {{ j.name }}</td><td>{{ j.events }}</td><td>{{ j.attempts }}</td><td>{{ bar(j.averageMillibar) }}</td><td>{{ j.modalPressures.map(p=>bar(p.millibar)).join(', ')||'No calculable' }}</td>
            </tr>
          </tbody>
        </table>
      </div><p>Intentos con varias fugas: {{ metrics.multipleLeakAttempts }}</p><p>Presión de falla más frecuente (todos los empates): {{ metrics.globalModalPressures?.map(p=>bar(p)).join(", ") || "No calculable" }}</p><h3>Distribución de presión (1–5 bar)</h3><p v-if="!metrics.pressures.length">
        Sin eventos de fuga.
      </p><div class="hydro-scroll">
        <table>
          <thead><tr><th>Presión exacta</th><th>Eventos</th><th>Intentos</th></tr></thead><tbody>
            <tr
              v-for="p in metrics.pressures"
              :key="p.millibar"
            >
              <td>{{ bar(p.millibar) }}</td><td>{{ p.events }}</td><td>{{ p.attempts }}</td>
            </tr>
          </tbody>
        </table>
      </div><h2>Tendencia por fecha de ejecución</h2><div class="hydro-chart">
        <EChart
          :option="trendChart"
          aria-label="Aprobaciones declaradas y fugas por día"
        />
      </div>
      <div class="hydro-grid">
        <section
          v-for="[title,rows] in [['Por operador',metrics.operators],['Por modelo',metrics.models],['Duración e intentos hasta primer aprobado por gabinete',metrics.cabinets],['Pruebas por día',metrics.daily]] as const"
          :key="title"
        >
          <h3>{{ title }}</h3><p v-if="!rows.length">
            Sin datos calculables.
          </p><div
            v-else
            class="hydro-scroll"
          >
            <table>
              <thead>
                <tr>
                  <th
                    v-for="key in Object.keys(rows[0]!)"
                    :key="key"
                  >
                    {{ metricHeading(key) }}
                  </th>
                </tr>
              </thead><tbody>
                <tr
                  v-for="(row,i) in rows"
                  :key="i"
                >
                  <td
                    v-for="(value,key) in row"
                    :key="key"
                  >
                    {{ key==='averageDurationMs'?duration(value):value??'No calculable' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div><nav aria-label="Páginas de productividad">
        <button
          class="btn"
          :disabled="metricPage===1||loading"
          @click="metricPage--;load()"
        >
          Anterior
        </button> Página {{ metricPage }} (hasta 25 días, operadores y gabinetes por página) <button
          class="btn"
          :disabled="loading||Math.max(metrics.daily.length,metrics.operators.length,metrics.cabinets.length)<25"
          @click="metricPage++;load()"
        >
          Siguiente
        </button>
      </nav>
    </section>
    <section class="card">
      <h2>Registros e intentos · {{ total }}</h2><p v-if="!loading&&!error&&!items.length">
        No hay intentos para esta población y filtros. Consulta el historial técnico completo para ver registros sin clasificación.
      </p><div
        v-if="items.length"
        class="hydro-scroll"
      >
        <table>
          <thead><tr><th>UID / gabinete</th><th>Modelo / intento local</th><th>Inicio / fin</th><th>Operador</th><th>Duración</th><th>Resultado</th><th>Fugas</th><th>Evidencias</th><th>Video</th><th>Tiempo / documento</th><th>Acceso</th></tr></thead><tbody>
            <tr
              v-for="t in items"
              :key="t.testId"
            >
              <td>
                {{ t.uid }}<br>{{ t.definitiveNumber||'Número definitivo no disponible' }}<br><RouterLink :to="`/levantamientos/nuevos-hidrantes/hidrostaticas/gabinetes/${t.originCabinetId}`">
                  Todos los intentos
                </RouterLink>
              </td><td>{{ t.model }} · #{{ t.attemptNumber??'Preparación' }}</td><td>{{ date(t.startedAt) }}<br>{{ date(t.endedAt) }}</td><td>{{ t.actor.name||t.actor.id }}</td><td>{{ duration(t.durationMs) }}</td><td :class="`result-${t.result}`">
                {{ label(t.result) }}<br>{{ label(t.classification) }}
              </td><td>{{ t.leakCount }}</td><td>{{ t.verifiedCount }} / {{ t.evidenceCount }} verificadas</td><td>{{ label(t.videoDeclaration) }}<br>{{ label(t.videoLinkState) }}</td><td>{{ label(t.timeState) }}<br>{{ label(t.validationState) }}<br>{{ t.documentReceived?'Documento recibido':'Documento pendiente' }}</td><td>
                <RouterLink :to="`/levantamientos/nuevos-hidrantes/hidrostaticas/intentos/${t.testId}`">
                  Ver intento
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div><nav aria-label="Páginas de intentos">
        <button
          class="btn"
          :disabled="page===1||loading"
          @click="page--;load()"
        >
          Anterior
        </button> Página {{ page }} <button
          class="btn"
          :disabled="page*25>=total||loading"
          @click="page++;load()"
        >
          Siguiente
        </button>
      </nav>
    </section>
  </main>
</template>
