<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Download, FileSpreadsheet, FileText } from "@lucide/vue";
import { dashboardService } from "@/services/dashboard";
import { problemMessage } from "@/api/client";
import type { FilterOption } from "@/api/types";
import { hydrantExportFilters, inspectionExportFilters, type ExportSelection } from "./export-utils";

const selection = ref<ExportSelection>("inspections-xlsx");
const exporting = ref(false), error = ref(""), success = ref("");
const technicians = ref<FilterOption[]>([]), crews = ref<FilterOption[]>([]), statuses = ref<string[]>([]);
const inspection = reactive({ search: "", userId: "", crewId: "", status: "", from: "", to: "", gps: "" });
const hydrant = reactive({ search: "", rvStatus: "", reviewed: "", hasInspections: "", installationYear: "", flowMin: "", flowMax: "", outletCount: "", coordinates: "", lastFrom: "", lastTo: "", sort: "accountNumber", direction: "asc" });
const isHydrant = computed(() => selection.value === "hydrants-xlsx");

async function download() {
  exporting.value = true; error.value = ""; success.value = "";
  try {
    const filename = await dashboardService.exportFile(selection.value, inspectionExportFilters(inspection), hydrantExportFilters(hydrant));
    success.value = `Descarga preparada: ${filename}`;
  } catch (cause) {
    error.value = problemMessage(cause, "No fue posible generar la exportación.");
  } finally { exporting.value = false; }
}
function clearFilters() {
  Object.assign(inspection, { search: "", userId: "", crewId: "", status: "", from: "", to: "", gps: "" });
  Object.assign(hydrant, { search: "", rvStatus: "", reviewed: "", hasInspections: "", installationYear: "", flowMin: "", flowMax: "", outletCount: "", coordinates: "", lastFrom: "", lastTo: "", sort: "accountNumber", direction: "asc" });
  error.value = ""; success.value = "";
}
onMounted(async () => {
  try {
    const values = await dashboardService.filters();
    technicians.value = values.technicians; crews.value = values.crews; statuses.value = values.statuses;
  } catch (cause) { error.value = problemMessage(cause, "No fue posible cargar los filtros disponibles."); }
});
</script>

<template>
  <div class="content exports">
    <div class="page-head"><div><h1 class="page-title">Exportaciones</h1><p class="page-subtitle">Archivos administrativos generados en servidor</p></div></div>
    <section class="format-grid" aria-label="Tipo de exportación">
      <button class="card format" :class="{ selected: selection === 'inspections-xlsx' }" @click="selection = 'inspections-xlsx'"><FileSpreadsheet/><b>Revisiones</b><span>XLSX completo</span></button>
      <button class="card format" :class="{ selected: selection === 'inspections-csv' }" @click="selection = 'inspections-csv'"><FileText/><b>Revisiones</b><span>CSV UTF-8</span></button>
      <button class="card format" :class="{ selected: selection === 'hydrants-xlsx' }" @click="selection = 'hydrants-xlsx'"><FileSpreadsheet/><b>Hidrantes</b><span>XLSX maestro</span></button>
    </section>
    <section class="card filter-panel" aria-label="Filtros de exportación">
      <header><div><h2>Filtros</h2><p>El archivo incluirá todos los registros coincidentes, sin paginación.</p></div><button class="btn" @click="clearFilters">Limpiar</button></header>
      <div v-if="!isHydrant" class="fields">
        <div class="field"><label>Cuenta o técnico</label><input v-model.trim="inspection.search" placeholder="Búsqueda del listado" /></div>
        <div class="field"><label>Técnico</label><select v-model="inspection.userId"><option value="">Todos</option><option v-for="item in technicians" :key="item.id" :value="item.id">{{ item.label }}</option></select></div>
        <div class="field"><label>Cuadrilla</label><select v-model="inspection.crewId"><option value="">Todas</option><option v-for="item in crews" :key="item.id" :value="item.id">{{ item.label }}</option></select></div>
        <div class="field"><label>Estado</label><select v-model="inspection.status"><option value="">Todos</option><option v-for="item in statuses" :key="item" :value="item">{{ item }}</option></select></div>
        <div class="field"><label>GPS</label><select v-model="inspection.gps"><option value="">Todos</option><option value="present">Con GPS</option><option value="absent">Sin GPS</option></select></div>
        <div class="field"><label>Desde</label><input v-model="inspection.from" type="date" /></div>
        <div class="field"><label>Hasta</label><input v-model="inspection.to" type="date" /></div>
      </div>
      <div v-else class="fields">
        <div class="field"><label>Cuenta</label><input v-model.trim="hydrant.search" placeholder="Buscar por cuenta" /></div>
        <div class="field"><label>Estado RV</label><select v-model="hydrant.rvStatus"><option value="">Todos</option><option value="completed">Completado</option><option value="pending">Pendiente</option></select></div>
        <div class="field"><label>Revisado</label><select v-model="hydrant.reviewed"><option value="">Todos</option><option value="true">Sí</option><option value="false">No</option></select></div>
        <div class="field"><label>Revisiones</label><select v-model="hydrant.hasInspections"><option value="">Todas</option><option value="true">Con revisiones</option><option value="false">Sin revisiones</option></select></div>
        <div class="field"><label>Coordenadas</label><select v-model="hydrant.coordinates"><option value="">Todas</option><option value="present">Disponibles</option><option value="absent">Ausentes</option></select></div>
        <div class="field"><label>Año instalación</label><input v-model="hydrant.installationYear" type="number" min="1900" max="2200" /></div>
        <div class="field"><label>Gasto mínimo</label><input v-model="hydrant.flowMin" type="number" min="0" step=".1" /></div>
        <div class="field"><label>Gasto máximo</label><input v-model="hydrant.flowMax" type="number" min="0" step=".1" /></div>
        <div class="field"><label>Salidas</label><input v-model="hydrant.outletCount" type="number" min="0" /></div>
        <div class="field"><label>Última revisión desde</label><input v-model="hydrant.lastFrom" type="date" /></div>
        <div class="field"><label>Última revisión hasta</label><input v-model="hydrant.lastTo" type="date" /></div>
        <div class="field"><label>Orden</label><select v-model="hydrant.sort"><option value="accountNumber">Cuenta</option><option value="lastInspectionAt">Última revisión</option><option value="inspectionCount">Revisiones</option><option value="installationYear">Año</option><option value="flowLps">Gasto</option></select></div>
        <div class="field"><label>Dirección</label><select v-model="hydrant.direction"><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></div>
      </div>
    </section>
    <div v-if="error" class="error-box" role="alert">{{ error }}</div>
    <div v-if="success" class="success-box" role="status">{{ success }}</div>
    <section class="card action-card"><div><b>{{ isHydrant ? "Hidrantes · XLSX" : `Revisiones · ${selection.endsWith("csv") ? "CSV" : "XLSX"}` }}</b><p>La generación ocurre en la API y respeta los filtros mostrados.</p></div><button class="btn btn--primary" :disabled="exporting" @click="download"><Download :size="18"/>{{ exporting ? "Generando…" : "Generar y descargar" }}</button></section>
    <p class="note muted">No cierres esta ventana hasta que comience la descarga. No se calcula un porcentaje porque la API no publica progreso.</p>
  </div>
</template>

<style scoped>
.exports{max-width:1200px}.format-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}.format{border:2px solid transparent;padding:18px;text-align:left;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;cursor:pointer;color:inherit}.format svg{grid-row:1/3;color:#198754}.format span{color:var(--muted);font-size:.78rem}.format.selected{border-color:#1768fa;background:#f5f8ff}.filter-panel{padding:18px;margin-bottom:14px}.filter-panel header{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:16px}.filter-panel h2{margin:0;font-size:1.05rem}.filter-panel p,.action-card p{margin:4px 0 0;color:var(--muted);font-size:.8rem}.fields{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:12px}.action-card{padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px}.success-box{background:#ecf9f1;border:1px solid #bde4cc;color:#08713b;padding:12px;border-radius:8px;margin-bottom:12px}.note{text-align:center;font-size:.78rem}@media(max-width:900px){.fields{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.format-grid,.fields{grid-template-columns:1fr}.action-card{align-items:stretch;flex-direction:column}.action-card .btn{width:100%}.filter-panel header{align-items:stretch;flex-direction:column}.format{min-height:82px}}
</style>
