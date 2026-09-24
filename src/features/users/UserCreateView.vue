<script setup lang="ts">
import { useRouter } from 'vue-router'
import UserEditor from './UserEditor.vue'
const router=useRouter()
</script>
<template><div class="content"><RouterLink to="/usuarios">Volver a usuarios</RouterLink><UserEditor @saved="id=>router.replace(`/usuarios/${id}`)" /></div></template>
