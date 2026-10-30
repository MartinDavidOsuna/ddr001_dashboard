<script setup lang="ts">
import {computed,onBeforeUnmount,ref,watch} from 'vue';
import {useRoute} from 'vue-router';
import ImageViewer from '@/components/ImageViewer.vue';
import {problemMessage} from '@/api/client';
import HydrostaticPhoto from './HydrostaticPhoto.vue';
import {hydroApi,type Detail,type Evidence,type History} from './hydrostatic.api';
import {bar,date,duration,label} from './hydrostatic.format';
import './hydrostatic.css';
const route=useRoute(),id=computed(()=>String(route.params.testId)),detail=ref<Detail>(),photos=ref<Evidence[]>([]),history=ref<History[]>([]),error=ref(''),loading=ref(false),photoPage=ref(1),historyPage=ref(1),morePhotos=ref(false),moreHistory=ref(false);
let controller:AbortController|undefined,generation=0;const selected=ref(-1),src=ref(''),photoError=ref(''),photoLoading=ref(false);let photoController:AbortController|undefined,photoGeneration=0;
function close(){photoGeneration++;photoController?.abort();if(src.value)URL.revokeObjectURL(src.value);src.value='';selected.value=-1;photoError.value='';photoLoading.value=false;}
async function open(index:number){close();selected.value=index;const p=photos.value[index];if(!p)return;const token=photoGeneration;photoController=new AbortController();photoLoading.value=true;try{const blob=await hydroApi.photo(id.value,p.id,'original',photoController.signal);if(token===photoGeneration)src.value=URL.createObjectURL(blob);}catch{if(token===photoGeneration)photoError.value='Original no disponible o no verificable en servidor/almacenamiento. No se confirmó integridad en vivo.';}finally{if(token===photoGeneration)photoLoading.value=false;}}
function move(delta:number){const size=photos.value.length;if(size)void open((selected.value+delta+size)%size);}
async function load(){close();controller?.abort();controller=new AbortController();const token=++generation;loading.value=true;error.value='';detail.value=undefined;photos.value=[];history.value=[];try{const s=controller.signal;const [d,p,h]=await Promise.all([hydroApi.detail(id.value,s),hydroApi.evidences(id.value,photoPage.value,s),hydroApi.history(id.value,historyPage.value,s)]);if(token===generation){detail.value=d;photos.value=p.items;history.value=h.items;morePhotos.value=!!p.hasMore;moreHistory.value=!!h.hasMore;}}catch(e){if(token===generation)error.value=problemMessage(e,'No se pudo consultar el expediente.');}finally{if(token===generation)loading.value=false;}}
watch(id,()=>{photoPage.value=1;historyPage.value=1;void load();},{immediate:true});onBeforeUnmount(()=>{generation++;controller?.abort();close();});
</script>
<template>
  <main class="content hydro">
    <RouterLink to="/levantamientos/nuevos-hidrantes/hidrostaticas">
      ← Pruebas Hidrostáticas
    </RouterLink><p
      v-if="loading"
      role="status"
    >
      Cargando intento…
    </p><p
      v-if="error"
      role="alert"
      class="card"
    >
      {{ error }} <button
        class="btn"
        @click="load"
      >
        Reintentar
      </button>
    </p><template v-if="detail">
      <header class="card">
        <h1>{{ detail.uid }} · Intento {{ detail.attemptNumber??'en preparación' }}</h1><p>{{ detail.notice }}</p><RouterLink :to="`/levantamientos/nuevos-hidrantes/hidrostaticas/gabinetes/${detail.originCabinetId}`">
          Ver todos los intentos del gabinete
        </RouterLink><p v-if="!detail.cabinetId">
          Relación actual del gabinete eliminada; identificación histórica preservada.
        </p>
      </header>
      <div class="hydro-grid">
        <section class="card">
          <h2>Identificación</h2><p>UID: {{ detail.uid }} · Modelo {{ detail.model }}<br>Operador: {{ detail.actor.name||detail.actor.id }}<br>testId: {{ detail.testId }}<br>Número local: {{ detail.attemptNumber??'No asignado' }}<br>Clasificación: {{ label(detail.classification) }}</p>
        </section><section class="card">
          <h2>Ejecución</h2><p>Inicio: {{ date(detail.startedAt) }}<br>Terminación: {{ date(detail.endedAt) }}<br>Duración: {{ duration(detail.durationMs) }}<br>Tiempo: {{ label(detail.timeState) }} · Recuperación: {{ label(detail.recoveryState) }}</p><p v-if="detail.location">
            GPS registrado: {{ detail.location.latitude }}, {{ detail.location.longitude }} · precisión {{ detail.location.accuracy??'desconocida' }} m
          </p><p v-else>
            Sin GPS disponible.
          </p><strong :class="`result-${detail.result}`">Resultado de campo: {{ label(detail.result) }}</strong>
        </section>
      </div>
      <section class="card">
        <h2>Fugas</h2><p v-if="!detail.leaks.length">
          No hay fugas registradas en la revisión actual. Esto no implica aprobación.
        </p><div class="hydro-scroll">
          <table v-if="detail.leaks.length">
            <thead><tr><th>Unión</th><th>Presión</th><th>Descripción</th><th>Evidencias en esta página</th></tr></thead><tbody>
              <tr
                v-for="leak in detail.leaks"
                :key="leak.id"
              >
                <td>{{ leak.jointCode }}</td><td>{{ bar(leak.pressureMillibar) }}</td><td>{{ leak.description }}</td><td>
                  <a
                    v-for="p in photos.filter(p=>p.joints.includes(leak.jointCode))"
                    :key="p.id"
                    :href="`#evidence-${p.id}`"
                  >{{ label(p.role) }} </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="card">
        <h2>Fotografías</h2><p>Verificación SQL: {{ detail.verifiedCount }} / {{ detail.evidenceCount }}. La apertura del original comprueba sus bytes en almacenamiento. No certifica el resultado hidráulico.</p><p v-if="!photos.length">
          Sin fotografías declaradas en esta página.
        </p><div class="photos">
          <HydrostaticPhoto
            v-for="(p,index) in photos"
            :id="`evidence-${p.id}`"
            :key="p.id"
            :photo="p"
            :test-id="id"
            @open="open(index)"
          />
        </div><nav aria-label="Páginas de fotografías">
          <button
            class="btn"
            :disabled="photoPage===1||loading"
            @click="photoPage--;load()"
          >
            Anterior
          </button> Página {{ photoPage }} <button
            class="btn"
            :disabled="!morePhotos||loading"
            @click="photoPage++;load()"
          >
            Siguiente
          </button>
        </nav>
      </section>
      <section class="card">
        <h2>Sincronización documental</h2><p>{{ detail.documentReceived?'Documento recibido':'Documento no recibido' }} · revisión fuente {{ detail.sourceRevision }} · versión servidor {{ detail.serverVersion }}<br>Recepción: {{ date(detail.receivedAt) }}<br>Estado: {{ label(detail.validationState) }}<br>Historial local pendiente de transferencia: {{ detail.pendingHistorySegments??'No disponible' }} segmentos<br>Revisión necesaria: {{ detail.requiresReview?'Sí':'No marcada' }}</p><p>El historial remoto puede no contener todas las operaciones locales del dispositivo.</p>
      </section>
      <section class="card">
        <h2>Video de WhatsApp</h2><p>Declaración del operador: {{ label(detail.videoDeclaration) }}<br>Fecha declarada: {{ date(detail.videoDeclaredAt) }}<br>Actor de la declaración: {{ detail.videoDeclaredBy || "No disponible" }}<br>Asociación administrativa: {{ label(detail.videoLinkState) }}</p><p>{{ detail.videoPolicy.message }}</p><button
          class="btn"
          disabled
        >
          Vincular video — infraestructura pendiente
        </button><details><summary>Procedimiento administrativo controlado</summary><ol><li>Recuperar externamente el archivo del grupo autorizado; no automatizar WhatsApp.</li><li>Comprobar propietario, UID físico, testId y declaración; no usar solo el número local de intento.</li><li>Antes de habilitar la carga, ampliar el contrato con objeto de almacenamiento autorizado, tipo, tamaño, hash, auditoría y sustitución preservando el vínculo anterior.</li><li>Verificar el archivo en TEST y servirlo únicamente por un endpoint administrativo autorizado. No introducir rutas NAS ni URLs manuales.</li></ol></details>
      </section>
      <section class="card">
        <h2>Historial administrativo y de sincronización</h2><p>Registro de solo lectura; IDs BIGINT conservados como texto.</p><p v-if="!history.length">
          Sin eventos remotos disponibles.
        </p><div class="hydro-scroll">
          <table v-if="history.length">
            <thead><tr><th>ID / tipo</th><th>Acción</th><th>Fecha fuente</th><th>Recepción</th><th>Estado / versión</th></tr></thead><tbody>
              <tr
                v-for="e in history"
                :key="`${e.kind}-${e.id}`"
              >
                <td>{{ e.id }} · {{ e.kind }}</td><td>{{ e.action }}</td><td>{{ date(e.occurredAt) }}</td><td>{{ date(e.receivedAt) }}</td><td>{{ e.beforeState??'—' }} → {{ e.afterState??'—' }} · {{ e.beforeVersion??'—' }} → {{ e.afterVersion??'—' }}</td>
              </tr>
            </tbody>
          </table>
        </div><nav aria-label="Páginas de historial">
          <button
            class="btn"
            :disabled="historyPage===1||loading"
            @click="historyPage--;load()"
          >
            Anterior
          </button> Página {{ historyPage }} <button
            class="btn"
            :disabled="!moreHistory||loading"
            @click="historyPage++;load()"
          >
            Siguiente
          </button>
        </nav>
      </section>
    </template><ImageViewer
      :open="selected>=0"
      :src="src"
      :photo-key="photos[selected]?.id"
      :alt="label(photos[selected]?.role)"
      navigation
      @close="close"
      @previous="move(-1)"
      @next="move(1)"
      @error="photoError='No se pudo decodificar la imagen.'"
    >
      <template #status>
        <p
          v-if="photoLoading"
          role="status"
        >
          Verificando y cargando original…
        </p><p
          v-if="photoError"
          role="alert"
        >
          {{ photoError }} <button
            class="btn"
            @click="open(selected)"
          >
            Reintentar original
          </button>
        </p>
      </template>{{ label(photos[selected]?.role) }} · {{ date(photos[selected]?.capturedAt) }} · {{ label(photos[selected]?.integrityState) }}
    </ImageViewer>
  </main>
</template>
