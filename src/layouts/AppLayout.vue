<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BarChart3,
  ClipboardList,
  Droplets,
  HardHat,
  Images,
  Map,
  Users,
  UserRound,
  CalendarDays,
  Smartphone,
  Download,
  Menu,
  LogOut,
  ChevronLeft,
} from "@lucide/vue";
import { useAuthStore } from "@/stores/auth";
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  open = ref(false),
  collapsed = ref(false);
const items = [
  ["Dashboard", "/dashboard", BarChart3],
  ["Revisiones", "/revisiones", ClipboardList],
  ["Hidrantes", "/hidrantes", Droplets],
  ["Levantamientos", "/levantamientos", HardHat],
  ["Fotografías", "/fotografias", Images],
  ["Mapa", "/mapa", Map],
  ["Usuarios", "/usuarios", Users],
  ["Cuadrillas", "/cuadrillas", UserRound],
  ["Jornadas", "/jornadas", CalendarDays],
  ["Dispositivos", "/dispositivos", Smartphone],
  ["Exportaciones", "/exportaciones", Download],
] as const;
const title = computed(() =>
  route.name === "inspection-detail"
    ? "Detalle de revisión"
    : route.name === "hydrant-detail"
      ? "Expediente de hidrante"
      : route.name === "construction-survey-detail"
        ? "Expediente de levantamiento"
        : items.find((x) => route.path.startsWith(x[1]))?.[0] || "DDR001",
);
async function logout() {
  await auth.logout();
  router.replace("/login");
}
window.addEventListener("ddr001:unauthorized", () => router.replace("/login"));
</script>
<template>
  <div class="shell" :class="{ collapsed }">
    <button
      v-if="open"
      class="backdrop"
      aria-label="Cerrar menú"
      @click="open = false"
    />
    <aside class="sidebar" :class="{ open }">
      <div class="brand">
        <div class="brand-mark">⌁</div>
        <div v-if="!collapsed">
          <strong>DDR001</strong><small>Sistema de Supervisión</small>
        </div>
      </div>
      <div class="district" v-if="!collapsed">
        <span>CNA<br />GUA</span><span>DDR</span
        ><small>Distrito de Riego 001</small>
      </div>
      <nav aria-label="Navegación principal">
        <small v-if="!collapsed" class="nav-label">MÓDULOS</small
        ><RouterLink
          v-for="[label, to, Icon] in items"
          :key="to"
          :to="to"
          @click="open = false"
          ><component :is="Icon" :size="18" /><span v-if="!collapsed">{{
            label
          }}</span></RouterLink
        >
      </nav>
      <button
        class="collapse desktop-only"
        :aria-label="collapsed ? 'Expandir menú' : 'Contraer menú'"
        @click="collapsed = !collapsed"
      >
        <ChevronLeft :class="{ flip: collapsed }" :size="18" />
      </button>
    </aside>
    <section class="workspace">
      <header>
        <button class="menu-btn" aria-label="Abrir menú" @click="open = true">
          <Menu />
        </button>
        <div>
          <strong>{{ title }}</strong
          ><small>Supervisión DDR001</small>
        </div>
        <div class="online desktop-only">● En línea</div>
        <div class="profile">
          <span>{{ auth.user?.role?.slice(0, 2).toUpperCase() }}</span>
          <div class="desktop-only">
            <strong>{{ auth.displayRole }}</strong
            ><small>{{ auth.user?.role }}</small>
          </div>
          <button
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            @click="logout"
          >
            <LogOut :size="18" />
          </button>
        </div>
      </header>
      <main><RouterView /></main>
    </section>
  </div>
</template>
<style scoped>
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px 1fr;
}
.shell.collapsed {
  grid-template-columns: 70px 1fr;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  background: var(--navy);
  color: #c7d9ee;
  display: flex;
  flex-direction: column;
  z-index: 30;
}
.brand {
  height: 64px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid #28405c;
}
.brand-mark {
  width: 36px;
  height: 36px;
  background: var(--blue);
  color: #fff;
  display: grid;
  place-items: center;
  border-radius: 6px;
  font-size: 24px;
}
.brand div:last-child {
  display: grid;
}
.brand small,
.profile small {
  font-size: 0.68rem;
  color: #8197b0;
}
.district {
  height: 84px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-bottom: 1px solid #28405c;
}
.district span {
  border: 1px solid #35516f;
  border-radius: 4px;
  padding: 5px;
  font-size: 0.56rem;
  text-align: center;
}
.district small {
  color: #7690ad;
}
.sidebar nav {
  padding: 18px 8px;
  display: grid;
  gap: 4px;
}
.nav-label {
  color: #52779d;
  letter-spacing: 0.1em;
  padding: 0 8px 8px;
}
.sidebar a {
  color: #b7cee7;
  text-decoration: none;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 0.86rem;
}
.sidebar a.router-link-active {
  background: var(--blue);
  color: #fff;
}
.collapse {
  margin-top: auto;
  border: 0;
  border-top: 1px solid #28405c;
  background: transparent;
  color: #7e9abb;
  padding: 16px;
  cursor: pointer;
}
.flip {
  transform: rotate(180deg);
}
.workspace {
  min-width: 0;
}
.workspace > header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  padding: 0 22px;
  gap: 14px;
  position: sticky;
  top: 0;
  z-index: 20;
}
.workspace > header > div:nth-child(2) {
  display: grid;
}
.workspace > header small {
  font-size: 0.72rem;
  color: var(--muted);
}
.online {
  margin-left: auto;
  color: #078940;
  border: 1px solid #bde7cc;
  background: #f0fff5;
  border-radius: 5px;
  padding: 7px 10px;
  font-size: 0.78rem;
}
.profile {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: 10px;
}
.profile > span {
  width: 31px;
  height: 31px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #1457dc;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}
.profile div {
  display: grid;
  font-size: 0.79rem;
}
.profile button,
.menu-btn {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #53657b;
  padding: 8px;
}
.menu-btn {
  display: none;
}
.backdrop {
  display: none;
}
@media (max-width: 900px) {
  .shell,
  .shell.collapsed {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    left: 0;
    transform: translateX(-100%);
    width: 240px;
    transition: 0.2s;
  }
  .sidebar.open {
    transform: none;
  }
  .menu-btn {
    display: block;
  }
  .backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: #0d1d32aa;
    border: 0;
    z-index: 25;
  }
  .workspace > header {
    padding: 0 12px;
  }
  .online {
    margin-left: auto;
  }
  .profile {
    margin-left: auto;
  }
}
</style>
