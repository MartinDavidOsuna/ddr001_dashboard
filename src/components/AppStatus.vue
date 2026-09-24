<script setup lang="ts">import { inspectionStatusLabel } from '@/features/inspections/inspection-status';defineProps<{status:string}>()</script>
<template><span class="status" :class="`status--${status}`">● {{inspectionStatusLabel(status)}}</span></template>
