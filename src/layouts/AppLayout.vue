<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
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
  ChevronRight,
  Settings,
  Wrench,
  Activity,
} from "@lucide/vue";
import { useAuthStore } from "@/stores/auth";
const platformVersion = __PLATFORM_VERSION__;
const aquafimLogo = `${import.meta.env.BASE_URL}branding/Aquafim-logo.png`;
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  open = ref(false),
  collapsed = ref(false);
const groups = [
  { label: "Módulos", items: [
  ["Dashboard", "/dashboard", BarChart3],
  ["Revisiones", "/revisiones", ClipboardList],
  ["Levantamientos", "/levantamientos", HardHat],
  ["Diagnósticos", "/diagnosticos", Activity],
  ["Fotografías", "/fotografias", Images],
  ["Mapa", "/mapa", Map],
  ] },
  { label: "Administración", items: [
  ["Hidrantes", "/hidrantes", Droplets],
  ["Usuarios", "/usuarios", Users],
  ["Cuadrillas", "/cuadrillas", UserRound],
  ["Jornadas", "/jornadas", CalendarDays],
  ["Dispositivos", "/dispositivos", Smartphone],
  ] },
  { label: "Herramientas", items: [
  ["Exportaciones", "/exportaciones", Download],
  ] },
] as const;
const items = groups.flatMap(group => [...group.items]);
const groupIcons = [Settings, Wrench];
const expandedGroup = ref<string | null>(null);
const sidebar = ref<HTMLElement>();
function closeSubmenu(event: PointerEvent) {
  if (!sidebar.value?.contains(event.target as Node)) expandedGroup.value = null;
}
onMounted(() => document.addEventListener("pointerdown", closeSubmenu));
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeSubmenu));
const title = computed(() =>
  route.name === 'functional-diagnostic-detail' ? 'Detalle de diagnóstico' :
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
    <aside ref="sidebar" class="sidebar" :class="{ open, 'submenu-open': expandedGroup }" @keydown.esc="expandedGroup = null">
      <div class="brand">
        <img class="brand-logo" :src="aquafimLogo" alt="Aquafim" width="168" height="42" />
        <small v-if="!collapsed">Sistema de supervisión</small>
      </div>
      <div class="district" v-if="!collapsed">
        <span>CNA<br />GUA</span><span>DDR</span
        ><small>Distrito de Riego 001</small>
      </div>
      <nav aria-label="Navegación principal">
        <small v-if="!collapsed" class="nav-label">Módulos</small>
        <RouterLink v-for="[label, to, Icon] in groups[0].items" :key="to" :to="to"
          :aria-label="label" :title="collapsed ? label : undefined"
          @mouseenter="expandedGroup = null" @click="open = false; expandedGroup = null">
          <component :is="Icon" :size="18" /><span v-if="!collapsed">{{ label }}</span>
        </RouterLink>
        <section v-for="(group, index) in groups.slice(1)" :key="group.label" class="nav-group" :aria-label="group.label"
          @mouseenter="expandedGroup = group.label" @mouseleave="expandedGroup = null">
          <button class="nav-area" :class="{ 'area-active': group.items.some(([, to]) => route.path.startsWith(to)) }"
            :aria-label="group.label" :title="collapsed ? group.label : undefined"
            :aria-expanded="expandedGroup === group.label" :aria-controls="`nav-group-${index}`"
            @click="expandedGroup = group.label" @keydown.down.prevent="expandedGroup = group.label">
            <component :is="groupIcons[index]" :size="18" />
            <span v-if="!collapsed">{{ group.label }}</span>
            <ChevronRight v-if="!collapsed" class="area-chevron" :size="16" />
          </button>
          <div :id="`nav-group-${index}`" v-if="expandedGroup === group.label" class="nav-flyout">
            <div class="nav-children">
              <strong class="flyout-title">{{ group.label }}</strong>
              <RouterLink v-for="[label, to, Icon] in group.items" :key="to" :to="to" :aria-label="label"
                @click="open = false; expandedGroup = null">
                <component :is="Icon" :size="18" /><span>{{ label }}</span>
              </RouterLink>
            </div>
          </div>
        </section>
      </nav>
      <footer class="sidebar-footer">
        <button
          class="collapse desktop-only"
          :aria-label="collapsed ? 'Expandir menú' : 'Contraer menú'"
          @click="collapsed = !collapsed; expandedGroup = null"
        >
          <ChevronLeft :class="{ flip: collapsed }" :size="18" />
        </button>
        <RouterLink class="sidebar-version" to="/acerca-de" :aria-label="`Versión ${platformVersion}`">v{{ platformVersion }}</RouterLink>
      </footer>
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
  min-height: 96px;
  flex-shrink: 0;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-bottom: 1px solid #28405c;
}
.brand-logo {
  width: 168px;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
}
.collapsed .brand {
  min-height: 64px;
  padding: 12px 8px;
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
  overflow: visible;
  min-height: 0;
}
.nav-group {
  position: relative;
}
.nav-label {
  text-transform: uppercase;
  color: #52779d;
  letter-spacing: 0.1em;
  padding: 0 8px 8px;
}
.sidebar a,
.nav-area {
  color: #b7cee7;
  text-decoration: none;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 0.86rem;
}
.nav-area {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 0.86rem;
  cursor: pointer;
}
.sidebar a:hover,
.sidebar a:focus-visible,
.nav-area:hover,
.nav-area.area-active {
  background: #203d5c;
  color: #fff;
}
.nav-area:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}
.area-chevron {
  margin-left: auto;
}
.nav-flyout {
  position: absolute;
  left: 100%;
  top: 0;
  width: 248px;
  padding-left: 8px;
  z-index: 40;
}
.nav-children {
  display: grid;
  gap: 4px;
  padding: 8px;
  background: var(--navy);
  border: 1px solid #35516f;
  border-radius: 8px;
  box-shadow: 0 12px 28px #07142640;
}
.flyout-title {
  color: #c7d9ee;
  font-size: 0.78rem;
  padding: 8px 10px;
}
.sidebar a.router-link-active {
  background: var(--blue);
  color: #fff;
}
.sidebar-footer {
  margin-top: auto;
  flex-shrink: 0;
}
.sidebar .sidebar-version,
.sidebar .sidebar-version.router-link-active {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8197b0;
  background: transparent;
  font-size: 0.68rem;
  text-decoration: none;
}
.sidebar-version:focus-visible {
  outline: 2px solid #8197b0;
  outline-offset: -3px;
}
.collapse {
  width: 100%;
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
  .sidebar.submenu-open {
    width: 168px;
  }
  .nav-flyout {
    width: min(248px, calc(100vw - 168px));
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
