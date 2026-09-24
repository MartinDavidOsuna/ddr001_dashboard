<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
const props = withDefaults(defineProps<{ option: EChartsCoreOption; ariaLabel?: string }>(), { ariaLabel: 'Gráfica de datos' })
const el = ref<HTMLElement>()
let chart: ECharts | undefined
let observer: IntersectionObserver | undefined, resizer: ResizeObserver | undefined, active=true, loading=false
const error=ref(false)
async function initialize() {
  if(chart||loading||!active||!el.value)return
  loading=true;error.value=false
  try {
    const {init}=await import('./chart-engine')
    if(!active||!el.value)return
    chart=init(el.value);chart.setOption(props.option)
    if(typeof ResizeObserver!=='undefined'){resizer=new ResizeObserver(()=>chart?.resize());resizer.observe(el.value)}
  } catch {error.value=true} finally {loading=false}
}
onMounted(() => {
  if(typeof IntersectionObserver==='undefined'){void initialize();return}
  observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer?.disconnect();void initialize()}},{rootMargin:'160px'})
  observer.observe(el.value!)
})
watch(() => props.option, (value) => chart?.setOption(value, true), { deep: true })
onBeforeUnmount(() => {
  active=false;observer?.disconnect();resizer?.disconnect()
  chart?.dispose()
})
</script>
<template><div class="chart-container"><div ref="el" class="chart" role="img" :aria-label="ariaLabel" /><button v-if="error" class="btn" @click="initialize">Reintentar gráfica</button></div></template>
<style scoped>.chart-container,.chart{width:100%;height:100%;min-height:250px}.chart-container{position:relative}.chart-container button{position:absolute;top:40%;left:10%}</style>
