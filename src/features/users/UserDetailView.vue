<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ArrowLeft, ClipboardCheck, Clock3, Mail, Phone, UsersRound } from "@lucide/vue";
import { useRoute } from "vue-router";
import { dashboardService } from "@/services/dashboard";
import { problemMessage } from "@/api/client";
import type { DashboardUserDetail } from "@/api/types";
import AppStatus from "@/components/AppStatus.vue";
import ConstructionUserAccessCard from "@/features/construction/ConstructionUserAccessCard.vue";
import { userDate, userInitials } from "./user-format";

const route = useRoute();
const user = ref<DashboardUserDetail>();
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try { user.value = await dashboardService.user(String(route.params.id)); }
  catch (cause) { error.value = problemMessage(cause, "No fue posible cargar el usuario."); }
  finally { loading.value = false; }
}
onMounted(load);
</script>

<template>
  <div class="content">
    <RouterLink class="back" to="/usuarios"><ArrowLeft :size="17"/>Volver a usuarios</RouterLink>
    <div v-if="error" class="error-box">{{ error }} <button class="btn" @click="load">Reintentar</button></div>
    <div v-else-if="loading" class="detail-grid"><section class="card profile skeleton"/><section class="card activity skeleton"/></div>
    <template v-else-if="user">
      <div class="page-head"><div><h1 class="page-title">Detalle de usuario</h1><p class="page-subtitle">Identidad y actividad operativa registrada</p></div><span class="state" :class="{ inactive: !user.isActive }">{{ user.isActive ? "Activo" : "Inactivo" }}</span></div>
      <div class="detail-grid">
        <section class="card profile">
          <header><span class="avatar">{{ userInitials(user.fullName) }}</span><div><h2>{{ user.fullName }}</h2><p>{{ user.employeeNumber || "Sin número de empleado" }}</p></div></header>
          <dl><div><dt><Mail :size="15"/>Correo</dt><dd>{{ user.email || "No registrado" }}</dd></div><div><dt><Phone :size="15"/>Teléfono</dt><dd>{{ user.phone || "No registrado" }}</dd></div><div><dt><UsersRound :size="15"/>Cuadrilla</dt><dd>{{ user.crewName || "Sin asignar" }}</dd></div><div><dt><Clock3 :size="15"/>Última actividad</dt><dd>{{ userDate(user.lastActivityAt) }}</dd></div></dl>
        </section>
        <section class="metrics">
          <article class="card"><b>{{ user.inspectionCount }}</b><span>Revisiones</span></article><article class="card"><b>{{ user.validatedCount }}</b><span>Validadas</span></article><article class="card"><b>{{ user.rejectedCount }}</b><span>Rechazadas</span></article><article class="card"><b>{{ user.sessionCount }}</b><span>Jornadas</span></article><article class="card"><b>{{ user.deviceCount }}</b><span>Dispositivos</span></article><article class="card"><b>{{ user.activeSessionCount }}</b><span>Sesiones activas</span></article>
        </section>
      </div>
      <ConstructionUserAccessCard :user-id="user.userId" />
      <section class="card section-card"><h2><ClipboardCheck :size="19"/>Revisiones recientes</h2><div v-if="user.recentInspections.length" class="rows"><RouterLink v-for="item in user.recentInspections" :key="item.inspectionId" :to="`/revisiones/${item.inspectionId}`"><span><b>Hidrante {{ item.accountNumber }}</b><small>{{ userDate(item.startedAt) }} · Revisión #{{ item.revisionNumber }}</small></span><AppStatus :status="item.status"/></RouterLink></div><p v-else class="muted">Este usuario no tiene revisiones registradas.</p></section>
      <section class="card section-card"><h2><Clock3 :size="19"/>Jornadas recientes</h2><div v-if="user.recentSessions.length" class="session-table"><div v-for="item in user.recentSessions" :key="item.workSessionId"><span><b>{{ item.crewName || "Sin cuadrilla" }}</b><small>{{ userDate(item.startedAt) }}</small></span><AppStatus :status="item.status"/><span>{{ item.endedAt ? userDate(item.endedAt) : "En curso" }}</span></div></div><p v-else class="muted">Este usuario no tiene jornadas registradas.</p></section>
    </template>
  </div>
</template>

<style scoped>
.back{display:inline-flex;align-items:center;gap:6px;margin-bottom:16px;color:#315a91;text-decoration:none;font-size:.82rem}.state{padding:5px 10px;border-radius:999px;background:#eaf9f0;color:#087a3b;font-size:.78rem;font-weight:700}.state.inactive{background:#fff0f0;color:#a52c2c}.detail-grid{display:grid;grid-template-columns:minmax(280px,1fr) 2fr;gap:14px;margin-bottom:14px}.profile{padding:20px}.profile header{display:flex;align-items:center;gap:13px;padding-bottom:18px;border-bottom:1px solid var(--line)}.profile h2{font-size:1.08rem;margin:0}.profile p{margin:4px 0 0;color:var(--muted);font-size:.79rem}.avatar{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#e9f1ff;color:#1557bd;font-weight:750}.profile dl{display:grid;gap:15px;margin:18px 0 0}.profile dt{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.72rem;text-transform:uppercase}.profile dd{margin:4px 0 0;font-size:.85rem;overflow-wrap:anywhere}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metrics article{padding:18px;display:grid;align-content:center;gap:5px}.metrics b{font-size:1.45rem;color:#153b72}.metrics span{font-size:.77rem;color:var(--muted)}.section-card{padding:18px;margin-top:14px}.section-card h2{display:flex;align-items:center;gap:7px;font-size:.95rem;margin:0 0 13px}.rows{display:grid}.rows>a,.session-table>div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #edf1f5;text-decoration:none;color:inherit}.rows span,.session-table span{display:grid;gap:3px}.rows small,.session-table small{color:var(--muted)}.session-table>div>span:last-child{font-size:.78rem;text-align:right}.skeleton{min-height:260px}.error-box .btn{margin-left:12px}@media(max-width:850px){.detail-grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(3,1fr)}}@media(max-width:520px){.metrics{grid-template-columns:1fr 1fr}.rows>a,.session-table>div{align-items:flex-start;flex-wrap:wrap}.session-table>div>span:last-child{width:100%;text-align:left}}
</style>
