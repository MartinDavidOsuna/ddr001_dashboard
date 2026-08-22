<script setup lang="ts">
import { ref } from "vue";
import { Download, FileSpreadsheet, Images, ListChecks } from "@lucide/vue";
import { dashboardService } from "@/services/dashboard";
import { problemMessage } from "@/api/client";

const exporting = ref(false);
const error = ref("");
async function download() {
  exporting.value = true;
  error.value = "";
  try {
    await dashboardService.exportInspections();
  } catch (cause) {
    error.value = problemMessage(
      cause,
      "No fue posible generar la exportación.",
    );
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="content exports">
    <div class="page-head">
      <div>
        <h1 class="page-title">Exportaciones</h1>
        <p class="page-subtitle">Descarga integral de revisiones visuales</p>
      </div>
    </div>
    <div v-if="error" class="error-box" role="alert">{{ error }}</div>
    <section class="card export-card">
      <div class="excel-icon"><FileSpreadsheet :size="34" /></div>
      <div>
        <h2>Exportación general de revisiones</h2>
        <p>
          Libro Excel con toda la información disponible, expresada en texto y
          separada en hojas para facilitar análisis y auditoría.
        </p>
        <ul>
          <li>
            <ListChecks :size="17" /> Revisiones, datos de hidrante, técnico,
            dispositivo, GPS y señal
          </li>
          <li>
            <ListChecks :size="17" /> Todas las respuestas, historial de estados
            y auditoría
          </li>
          <li>
            <Images :size="17" /> Inventario fotográfico con enlaces para abrir
            cada imagen
          </li>
        </ul>
      </div>
      <button class="btn btn--primary" :disabled="exporting" @click="download">
        <Download :size="18" />{{
          exporting ? "Generando Excel…" : "Descargar Excel completo"
        }}
      </button>
    </section>
    <p class="note muted">
      La generación puede tardar según el número total de revisiones. Mantén
      esta ventana abierta hasta que inicie la descarga.
    </p>
  </div>
</template>

<style scoped>
.exports {
  max-width: 1100px;
}
.export-card {
  padding: 28px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 22px;
  align-items: center;
}
.excel-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: #e8f7ee;
  color: #148249;
  display: grid;
  place-items: center;
}
.export-card h2 {
  margin: 0 0 8px;
  font-size: 1.15rem;
}
.export-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}
.export-card ul {
  list-style: none;
  padding: 0;
  margin: 18px 0 0;
  display: grid;
  gap: 9px;
  font-size: 0.85rem;
}
.export-card li {
  display: flex;
  gap: 8px;
  align-items: center;
}
.export-card li svg {
  color: var(--green);
  flex: none;
}
.note {
  text-align: center;
  font-size: 0.78rem;
  margin-top: 15px;
}
@media (max-width: 760px) {
  .export-card {
    grid-template-columns: auto 1fr;
  }
  .export-card .btn {
    grid-column: 1/-1;
  }
  .excel-icon {
    width: 50px;
    height: 50px;
  }
}
</style>
