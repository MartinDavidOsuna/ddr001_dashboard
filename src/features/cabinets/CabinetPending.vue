<script setup lang="ts">
import type { CabinetPending, CabinetAdminDossier } from "./cabinets.generated";
import { label } from "./cabinets.format";
import { subjectAnchor } from "./cabinets.dossier";
defineProps<{ items: CabinetPending[]; dossier?: CabinetAdminDossier }>();
</script>
<template>
  <ul
    v-if="items.length"
    class="cabinet-pending"
  >
    <li
      v-for="(p, index) in items"
      :key="`${p.code}-${p.subject}-${index}`"
    >
      <span
        :class="[
          'cabinet-badge',
          p.classification === 'minor' ? '' : 'incomplete',
        ]"
      >{{ label(p.classification) }}</span>
      <a :href="subjectAnchor(p.subject, dossier)">{{ p.subject }}</a> ·
      {{ p.code }}
      <p>{{ p.reason }}</p>
    </li>
  </ul>
</template>
