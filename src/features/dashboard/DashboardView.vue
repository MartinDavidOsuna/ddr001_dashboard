<script setup lang="ts">
import InspectionDashboardSection from '@/features/inspections/InspectionDashboardSection.vue'
import ConstructionDashboardSection from '@/features/construction/ConstructionDashboardSection.vue'
</script>
<template>
  <div class="content">
    <div class="page-head"><div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Supervisión general — datos operativos reales</p></div><span class="muted desktop-only">Actualización al cargar</span></div>
    <InspectionDashboardSection />
    <ConstructionDashboardSection />
  </div>
</template>
