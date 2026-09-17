<script setup lang="ts">
import type { MapItem } from "./map.types";
import { domainInfo } from "./map.types";
import { statusStyle } from "./map.colors";
defineProps<{ item: MapItem; neighbors?: MapItem[] }>();
defineEmits<{ close: []; select: [key: string] }>();
</script>
<template>
  <section
    class="map-selection"
    aria-label="Elemento seleccionado"
    @keydown.esc="$emit('close')"
  >
    <header>
      <div>
        <small>{{ domainInfo[item.domain].singular }}</small>
        <h2>{{ item.title }}</h2>
      </div>
      <button class="btn" aria-label="Cerrar detalle" @click="$emit('close')">
        ×
      </button>
    </header>
    <div v-if="neighbors && neighbors.length > 1" class="map-neighbors">
      <label
        >Hidrantes en este punto ({{ neighbors.length }})
        <select
          aria-label="Hidrante del punto agrupado"
          :value="item.key"
          @change="$emit('select', ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="neighbor in neighbors"
            :key="neighbor.key"
            :value="neighbor.key"
          >
            {{ neighbor.title }} · {{ neighbor.status }}
          </option>
        </select>
      </label>
    </div>
    <p
      class="map-badge"
      :style="{
        color: statusStyle(item).color,
        border: '1px solid currentColor',
      }"
    >
      {{ item.status }}
    </p>
    <p v-if="item.simulation" class="map-simulation">
      SIMULACIÓN · contiene mediciones simuladas
    </p>
    <dl>
      <template v-for="[name, value] in item.details" :key="name"
        ><dt>{{ name }}</dt>
        <dd>{{ value }}</dd></template
      >
    </dl>
    <footer>
      <RouterLink class="btn btn-primary" :to="item.href"
        >Ver {{ domainInfo[item.domain].singular.toLowerCase() }}</RouterLink
      ><RouterLink
        v-if="item.latestInspectionHref"
        class="btn"
        :to="item.latestInspectionHref"
        >Ver última revisión</RouterLink
      >
    </footer>
  </section>
</template>
