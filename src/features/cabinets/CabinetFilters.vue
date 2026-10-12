<script setup lang="ts">
import type { CabinetFilters } from "./cabinets.query";
import { statuses, models, label } from "./cabinets.format";
defineProps<{
  filters: CabinetFilters;
  companies: Array<{ id: string; name: string }>;
  pageSize: number;
  error: string;
}>();
const emit = defineEmits<{
  update: [key: keyof CabinetFilters, value: string];
  size: [value: number];
  apply: [];
  clear: [];
}>();
const value = (e: Event) => (e.target as HTMLInputElement).value;
</script>
<template>
  <form
    class="card cabinet-stack"
    aria-label="Filtros de Nuevos Hidrantes"
    @submit.prevent="emit('apply')"
  >
    <h2>Filtros del listado e indicadores</h2>
    <p>
      Desde inclusivo y hasta día completo · días de Hermosillo. Listado,
      resumen y distribuciones: fecha de registro completado. Actividad: fecha
      del evento.
    </p>
    <div class="cabinet-filters">
      <label>Búsqueda general<input
        :value="filters.search"
        maxlength="180"
        placeholder="UID, base, cuenta, empresa o modelo"
        @input="emit('update', 'search', value($event))"
      ></label>
      <label>Estado<select
        :value="filters.status"
        @change="emit('update', 'status', value($event))"
      >
        <option value="">Todos</option>
        <option
          v-for="s in statuses"
          :key="s"
          :value="s"
        >
          {{ label(s) }}
        </option>
      </select></label>
      <label>Modelo<select
        :value="filters.model"
        @change="emit('update', 'model', value($event))"
      >
        <option value="">Todos</option>
        <option
          v-for="m in models"
          :key="m"
        >{{ m }}</option>
      </select></label>
      <label>Variante<select
        :value="filters.automated"
        @change="emit('update', 'automated', value($event))"
      >
        <option value="">Todas</option>
        <option value="false">Estándar</option>
        <option value="true">Automatizado</option>
      </select></label>
      <label>Empresa<select
        :value="filters.crewId"
        @change="emit('update', 'crewId', value($event))"
      >
        <option value="">Todas</option>
        <option
          v-if="
            filters.crewId && !companies.some((c) => c.id === filters.crewId)
          "
          :value="filters.crewId"
        >
          Empresa del enlace seleccionado
        </option>
        <option
          v-for="c in companies"
          :key="c.id"
          :value="c.id"
        >
          {{ c.name }}
        </option>
      </select></label>
      <label>Desde<input
        type="date"
        :value="filters.from"
        @input="emit('update', 'from', value($event))"
      ></label><label>Hasta<input
        type="date"
        :value="filters.to"
        @input="emit('update', 'to', value($event))"
      ></label>
      <label>Registros por página<select
        :value="pageSize"
        @change="emit('size', Number(value($event)))"
      >
        <option
          v-for="s in [10, 25, 50, 100]"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select></label>
    </div>
    <details>
      <summary>Filtros específicos</summary>
      <div class="cabinet-filters">
        <label>UID<input
          :value="filters.uid"
          maxlength="12"
          @input="emit('update', 'uid', value($event))"
        ></label><label>Cuenta<input
          :value="filters.accountNumber"
          maxlength="180"
          @input="emit('update', 'accountNumber', value($event))"
        ></label><label>Base vinculada (UUID)<input
          :value="filters.baseSurveyId"
          @input="emit('update', 'baseSurveyId', value($event))"
        ></label>
      </div>
    </details>
    <p
      v-if="error"
      role="alert"
      class="cabinet-error"
    >
      {{ error }}
    </p>
    <div class="cabinet-actions">
      <button class="btn btn--primary">
        Aplicar filtros
      </button><button
        class="btn"
        type="button"
        @click="emit('clear')"
      >
        Restablecer
      </button>
    </div>
  </form>
</template>
