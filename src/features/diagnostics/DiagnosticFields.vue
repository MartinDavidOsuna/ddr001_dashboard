<script setup lang="ts">
import { date, display, hasValue } from "./diagnostics.format";
defineProps<{
  value: Record<string, unknown>;
  fields?: ReadonlyArray<readonly [string, string]>;
}>();
const title = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
</script>
<template>
  <dl class="diag-fields">
    <div
      v-for="[key, name] in fields ??
      Object.keys(value).map((key) => [key, title(key)])"
      :key="key"
    >
      <dt>{{ name }}</dt>
      <dd v-if="value[key] && typeof value[key] === 'object'">
        <details>
          <summary>Ver datos</summary>
          <DiagnosticFields :value="value[key] as Record<string, unknown>" />
        </details>
      </dd>
      <dd v-else :title="display(value[key])">
        {{
          /At$/.test(key) && hasValue(value[key])
            ? date(value[key])
            : display(value[key])
        }}
      </dd>
    </div>
  </dl>
</template>
