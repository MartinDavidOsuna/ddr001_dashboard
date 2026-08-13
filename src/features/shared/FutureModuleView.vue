<script setup lang="ts">import {computed}from'vue';import{useRoute}from'vue-router';const route=useRoute();const name=computed(()=>String(route.params.module||'Módulo'))</script>
<template><div class="content"><div class="page-head"><div><h1 class="page-title">{{name.charAt(0).toUpperCase()+name.slice(1)}}</h1><p class="page-subtitle">Módulo preparado para una fase posterior</p></div></div><section class="empty-box"><h2>Próximamente</h2><p class="muted">Esta sección está fuera del alcance funcional de Fase 1. No se muestran datos ficticios.</p></section></div></template>

