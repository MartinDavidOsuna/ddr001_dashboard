<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use, type ECharts, type EChartsCoreOption } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])
const props = withDefaults(defineProps<{ option: EChartsCoreOption; ariaLabel?: string }>(), { ariaLabel: 'Gráfica de datos' })
const el = ref<HTMLElement>()
let chart: ECharts | undefined
const resize = () => chart?.resize()
onMounted(() => {
  chart = init(el.value!)
  chart.setOption(props.option)
  window.addEventListener('resize', resize)
})
watch(() => props.option, (value) => chart?.setOption(value, true), { deep: true })
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>
<template><div ref="el" class="chart" role="img" :aria-label="ariaLabel" /></template>
<style scoped>.chart{width:100%;height:100%;min-height:250px}</style>
