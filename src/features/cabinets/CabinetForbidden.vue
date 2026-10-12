<script setup lang="ts">
import "./cabinets.css";
</script>
<template>
  <main class="content cabinets">
    <section
      class="card cabinet-error"
      role="alert"
    >
      <h1>Nuevos Hidrantes · acceso restringido</h1>
      <p>
        Este módulo está disponible sólo para administradores y supervisores.
      </p>
      <RouterLink
        class="btn"
        to="/levantamientos/bases"
      >
        Abrir Bases
      </RouterLink>
    </section>
  </main>
</template>
