import type { EChartsCoreOption } from 'echarts/core';
import type { RvAnalyticsResponse, RvDistribution } from './rv-analytics.types';
export const availabilityCodes = ['flow_meter', 'filter', 'venturi', 'solar_panel', 'battery', 'controller', 'air_valve'].map(x => 'RV-INV-' + x);
const wrap = (text: string) => text.replace(/(.{1,23})(?:\s|$)/g, '$1\n').trim();
export function bars(rows: { label: string; value: number; detail: string }[], name: string): EChartsCoreOption {
  return { tooltip: { trigger: 'item', renderMode: 'richText', confine: true },
    grid: { left: 8, right: 40, top: 12, bottom: 30, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, name, nameLocation: 'middle', nameGap: 24 },
    yAxis: { type: 'category', inverse: true, data: rows.map(r => wrap(r.label)), axisLabel: { fontSize: 11 }, axisTick: { show: false } },
    series: [{ type: 'bar', barMaxWidth: 24, itemStyle: { color: '#d18a2d', borderRadius: [0,4,4,0] }, label: { show: true, position: 'right' },
      data: rows.map(r => ({ value: r.value, tooltip: { formatter: () => r.label + '\n' + r.detail } })) }],
  };
}
export function paretoChart(data: RvAnalyticsResponse) {
  return bars(data.pareto.map(r => ({ label: r.label, value: r.affected, detail: `Afectados: ${r.affected}\nEvaluados: ${r.evaluated}\nIncidencia: ${r.percentage}%\nAcumulado: ${r.cumulativePercentage}%` })), data.scope.mode === 'current' ? 'Hidrantes afectados' : 'Inspecciones afectadas');
}
export function systemsChart(data: RvAnalyticsResponse) {
  return bars(data.systems.map(r => ({ label: r.system, value: r.hydrantsAffected, detail: `Hidrantes afectados: ${r.hydrantsAffected}\nHidrantes evaluados: ${r.hydrantsEvaluated}\nIncidencia: ${r.percentageAffected}%\nHallazgos: ${r.findingCount}` })), 'Hidrantes afectados');
}
export function distributionChart(d: RvDistribution) {
  return bars(d.values.map(v => ({ label: v.label, value: v.count, detail: `${v.count} / ${d.denominator}\n${v.percentage}%` })), d.unit === 'hydrants' ? 'Hidrantes' : 'Inspecciones');
}
export function availabilityChart(distributions: RvDistribution[]): EChartsCoreOption {
  const states = [{key:'true',name:'Presente',color:'#3e829c'},{key:'false',name:'Ausente',color:'#d18a2d'},{key:'NO_APLICA',name:'No aplica',color:'#9ba9b6'},{key:'SIN_DATO',name:'Sin dato',color:'#dce3eb'}];
  return { tooltip: { trigger: 'item', renderMode: 'richText', confine: true }, legend: { bottom: 0 },
    grid: { left: 8, right: 15, top: 15, bottom: 65, containLabel: true },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', inverse: true, data: distributions.map(d => wrap(d.label)), axisLabel: { fontSize: 11 } },
    series: states.map(s => ({ type: 'bar', name: s.name, stack: 'availability', barMaxWidth: 24, itemStyle: {color:s.color}, data: distributions.map(d => {
      const v = d.values.find(v => v.key === s.key);
      return { value: v?.percentage ?? 0, tooltip: { formatter: () => `${d.label}\n${s.name}: ${v?.count ?? 0} / ${d.denominator}\n${v?.percentage ?? 0}%` } };
    }) })),
  };
}
export function trendChart(data: RvAnalyticsResponse): EChartsCoreOption {
  return { tooltip: { trigger: 'item', renderMode: 'richText', confine: true }, legend: { bottom: 0 },
    grid: { left: 40, right: 15, top: 15, bottom: 70 },
    xAxis: { type: 'category', data: data.trend.map(p => p.date) }, yAxis: {type:'value',minInterval:1},
    series: [{key:'evaluated',name:'Evaluados',color:'#3e829c'},{key:'affected',name:'Con hallazgos',color:'#d18a2d'}].map(s => ({
      type:'line',name:s.name,itemStyle:{color:s.color},data:data.trend.map(p => ({value:s.key === 'evaluated' ? p.evaluated : p.affected,tooltip:{formatter:()=>`${p.date}\nInspecciones evaluadas: ${p.evaluated}\nCon hallazgos: ${p.affected}\nIncidencia: ${p.percentageAffected}%`}}))
    })),
  };
}
