import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import AppLayout from "@/layouts/AppLayout.vue";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/features/auth/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: AppLayout,
      children: [
        { path: "", redirect: "/dashboard" },
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/features/dashboard/DashboardView.vue"),
        },
        {
          path: "revisiones",
          name: "inspections",
          component: () =>
            import("@/features/inspections/InspectionListView.vue"),
        },
        {
          path: "revisiones/:id",
          name: "inspection-detail",
          component: () =>
            import("@/features/inspections/InspectionDetailView.vue"),
        },
        {
          path: "hidrantes",
          name: "hydrants",
          component: () => import("@/features/hydrants/HydrantListView.vue"),
        },
        {
          path: "hidrantes/:id",
          name: "hydrant-detail",
          component: () => import("@/features/hydrants/HydrantDetailView.vue"),
        },
        {
          path: "fotografias",
          name: "photos",
          component: () => import("@/features/photos/PhotoGalleryView.vue"),
        },
        {
          path: "exportaciones",
          name: "exports",
          component: () => import("@/features/exports/ExportView.vue"),
        },
        {
          path: "usuarios",
          name: "users",
          component: () => import("@/features/users/UserListView.vue"),
        },
        {
          path: "usuarios/:id",
          name: "user-detail",
          component: () => import("@/features/users/UserDetailView.vue"),
        },
        {
          path: ":module(mapa|cuadrillas|jornadas|dispositivos)",
          name: "future",
          component: () => import("@/features/shared/FutureModuleView.vue"),
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("@/features/shared/NotFoundView.vue"),
    },
  ],
});
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.restore();
  if (!to.meta.public && !auth.authenticated)
    return { name: "login", query: { redirect: to.fullPath } };
  if (to.name === "login" && auth.authenticated) return { name: "dashboard" };
});
export default router;
