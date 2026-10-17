<script setup lang="ts">
import { Eye, MapPin, Signal, Camera } from '@lucide/vue';
import AppStatus from '@/components/AppStatus.vue';
import type { InspectionListItem } from '@/api/types';
defineProps<{ items: InspectionListItem[] }>();
function date(v: string) { return new Intl.DateTimeFormat('es-MX', {dateStyle:'short',timeStyle:'short',timeZone:'America/Hermosillo'}).format(new Date(v)); }
</script>
<template>
  <div class="table-card card desktop-table">
    <table>
      <thead>
        <tr>
          <th>Hidrante</th>
          <th>Técnico / cuadrilla</th>
          <th>Fecha</th>
          <th>Rev.</th>
          <th>Estado</th>
          <th>Fotos</th>
          <th>GPS</th>
          <th>Señal</th>
          <th>Actualización</th>
          <th><span class="sr-only">Acción</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="x in items"
          :key="x.inspectionId"
        >
          <td>
            <RouterLink
              class="account"
              :to="`/revisiones/${x.inspectionId}`"
            >
              {{ x.accountNumber }}
            </RouterLink>
          </td>
          <td>
            <b>{{ x.technicianName }}</b><small>{{ x.crewName || "Sin cuadrilla" }}</small>
          </td>
          <td>{{ date(x.startedAt) }}</td>
          <td class="mono">
            #{{ x.revisionNumber }}
          </td>
          <td><AppStatus :status="x.status" /></td>
          <td>
            <span
              v-if="x.status==='inactive'"
              class="photo-count"
            ><Camera :size="15" />{{ x.totalPhotos }} de ausencia</span>
            <span
              v-else
              class="photo-count"
              :class="{ missing: !x.mandatoryPhotosComplete }"
            >
              <Camera :size="15" />
              <b>{{ x.mandatoryPhotosCompleted }}/{{ x.mandatoryPhotosRequired }}</b>
              obligatorias
              <small>{{ x.totalPhotos }} total</small>
            </span>
          </td>
          <td>
            <span
              class="signal-cell"
              :class="{ missing: !x.hasGps }"
            ><MapPin :size="15" />{{
              x.hasGps
                ? x.gpsAccuracyM
                  ? `${x.gpsAccuracyM} m`
                  : "Sí"
                : "Sin GPS"
            }}</span>
          </td>
          <td>
            <span
              class="signal-cell"
              :class="{ missing: !x.hasSignal }"
            ><Signal :size="15" />{{
              x.hasSignal
                ? [
                  x.signalGeneration,
                  x.signalDbm != null ? `${x.signalDbm} dBm` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
                : "Sin señal"
            }}</span>
          </td>
          <td>{{ date(x.updatedAt) }}</td>
          <td>
            <RouterLink
              class="view"
              :to="`/revisiones/${x.inspectionId}`"
            >
              <Eye :size="16" />Ver
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="mobile-list">
    <article
      v-for="x in items"
      :key="x.inspectionId"
      class="card review-card"
    >
      <header>
        <RouterLink
          class="account"
          :to="`/revisiones/${x.inspectionId}`"
        >
          Hidrante {{ x.accountNumber }}
        </RouterLink><AppStatus :status="x.status" />
      </header>
      <b>{{ x.technicianName }}</b><small>{{ x.crewName || "Sin cuadrilla" }} ·
        {{ date(x.startedAt) }}</small>
      <div>
        <span v-if="x.status==='inactive'"><Camera :size="15" />{{ x.totalPhotos }} de ausencia</span><span v-else><Camera :size="15" />{{ x.mandatoryPhotosCompleted }}/{{
          x.mandatoryPhotosRequired
        }} · {{ x.totalPhotos }} total</span><span><MapPin :size="15" />{{ x.hasGps ? "GPS" : "Sin GPS" }}</span><span><Signal :size="15" />{{
          x.signalGeneration || "Sin señal"
        }}</span>
      </div>
      <RouterLink
        class="btn"
        :to="`/revisiones/${x.inspectionId}`"
      >
        <Eye :size="16" />Ver revisión
      </RouterLink>
    </article>
  </div>
</template>
<style scoped>
.list-content {
  max-width: none;
}
.list-title {
  font-size: 1rem;
  margin: 0;
}
.list-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.list-actions{display:flex;gap:8px;flex-wrap:wrap}
.list-actions .btn{text-decoration:none}
.list-toolbar {
  display: flex;
  gap: 9px;
  margin-bottom: 12px;
}
.search {
  height: 42px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #cdd7e2;
  border-radius: 7px;
  color: #71849c;
}
.search input {
  border: 0;
  outline: 0;
  flex: 1;
  min-width: 0;
}
.filters {
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 13px;
}
.filter-actions {
  display: flex;
  gap: 8px;
  align-items: end;
}
.table-card {
  overflow: auto;
}
.table-card table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  white-space: nowrap;
}
.table-card th {
  text-align: left;
  color: #5d718c;
  background: #f8fafc;
  font-size: 0.68rem;
  text-transform: uppercase;
  padding: 12px;
}
.table-card td {
  padding: 13px 12px;
  border-top: 1px solid #edf1f5;
}
.table-card td:nth-child(2) {
  display: grid;
  gap: 3px;
}
.table-card td small {
  color: #73869e;
}
.account,
.view {
  color: #135bd6;
  text-decoration: none;
  font-family: ui-monospace, monospace;
  font-weight: 650;
}
.view {
  display: flex;
  gap: 5px;
  align-items: center;
}
.signal-cell {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: #247d4b;
}
.signal-cell.missing {
  color: #a73434;
}
.photo-count {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 2px 5px;
  color: #247d4b;
}
.photo-count small {
  grid-column: 2;
  color: #71849b;
}
.photo-count.missing {
  color: #a66a00;
}
.row-skeleton {
  height: 42px;
  margin: 10px;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 14px;
  font-size: 0.78rem;
}
.pagination span {
  margin-right: auto;
}
.pagination label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pagination select {
  height: 35px;
}
.mobile-list {
  display: none;
}
.review-card {
  padding: 14px;
  display: grid;
  gap: 9px;
}
.review-card header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.review-card small {
  color: var(--muted);
}
.review-card > div {
  display: flex;
  gap: 15px;
}
.review-card > div span {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 0.78rem;
}
@media (max-width: 1150px) {
  .filters {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 900px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
  .filter-actions {
    grid-column: 1/-1;
  }
  .desktop-table {
    display: none;
  }
  .mobile-list {
    display: grid;
    gap: 10px;
  }
  .pagination {
    flex-wrap: wrap;
  }
  .pagination span {
    width: 100%;
    margin: 0;
  }
  .list-toolbar .btn {
    padding: 9px;
  }
  .review-card .status {
    font-size: 0.68rem;
  }
}
@media (max-width: 430px) {
  .filters {
    grid-template-columns: 1fr;
  }
  .filter-actions {
    grid-column: auto;
  }
}
</style>
