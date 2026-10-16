import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { AxiosError } from 'axios';
import fixture from '../../../docs/rv-dashboard-analytics.example.json';
import type { RvAnalyticsResponse } from './rv-analytics.types';
import InspectionAnalyticsView from './InspectionAnalyticsView.vue';
import InspectionAnalyticsCharts from './InspectionAnalyticsCharts.vue';
import InspectionAnalyticsQuality from './InspectionAnalyticsQuality.vue';
import InspectionListBody from './InspectionListBody.vue';
import { analyticsError, localDateRange, useRvAnalytics } from './rv-analytics.state';
import { availabilityChart, paretoChart, systemsChart } from './rv-analytics.charts';
const service = vi.hoisted(() => ({ rvAnalytics:vi.fn(), inspections:vi.fn(), filters:vi.fn() }));
vi.mock('@/services/dashboard', () => ({ dashboardService:service }));
const globals = { stubs:{ EChart:{props:['option','ariaLabel'],template:'<div class="chart-stub" :aria-label="ariaLabel" />'}, RouterLink:{props:['to'],template:'<a :href="to"><slot /></a>'} } };
const empty = () => structuredClone(fixture) as RvAnalyticsResponse;
function populated() {
 const data=empty();
 data.summary={...data.summary,selectedInspections:13,selectedHydrants:12,evaluatedHydrants:11,hydrantsWithFindings:7,hydrantsWithoutFindings:4,findingCount:19,inactiveHydrants:1,catalogHydrants:20,coveragePercent:60};
 data.findings[0]={...data.findings[0]!,affected:7,evaluated:11,percentage:63.64,noData:2,notApplicable:3};
 data.pareto=[{...data.findings[0]!,cumulativeAffected:7,cumulativePercentage:100}];
 data.systems[0]={...data.systems[0]!,hydrantsAffected:7,hydrantsEvaluated:11,percentageAffected:63.64,findingCount:19};
 const d=data.distributions.find(d=>d.itemCode==='flow_meter')!;
 d.denominator=13;d.values=[{key:'true',label:'S?',count:7,percentage:53.85},{key:'false',label:'No',count:1,percentage:7.69},{key:'NO_APLICA',label:'No aplica',count:3,percentage:23.08},{key:'SIN_DATO',label:'Sin dato',count:2,percentage:15.38}];
 data.dataQuality.withoutGps=5;data.dataQuality.requiredEvidence.complete=8;
 return data;
}
beforeEach(()=>{vi.clearAllMocks();service.rvAnalytics.mockResolvedValue(populated());service.inspections.mockResolvedValue({items:[],total:0,page:1,pageSize:10});service.filters.mockResolvedValue({technicians:[{id:'t1',label:'Tecnico Uno'}],crews:[{id:'c1',label:'Cuadrilla Uno'}],statuses:['submitted','validated','inactive']});});
describe('RV analytics contract presentation',()=>{
 it('renders server summary, findings, systems, quality and list navigation with one initial request',async()=>{
  const w=mount(InspectionAnalyticsView,{global:globals});await flushPromises();
  expect(w.text()).toContain('estado observado');expect(w.text()).toContain('63.64%');expect(w.text()).toContain('60%');
  expect(w.findAll('.rv-kpi')).toHaveLength(6);expect(w.findAll('.rv-finding')).toHaveLength(1);
  expect(w.text()).toContain('19 hallazgos');expect(w.text()).toContain('Sin GPS');
  expect(service.rvAnalytics).toHaveBeenCalledTimes(1);expect(service.rvAnalytics.mock.calls[0]![0]).toEqual({mode:'current',grain:'month'});
  expect(service.inspections).toHaveBeenCalledExactlyOnceWith({page:1,pageSize:10});
  expect(w.find('a[href="/revisiones/listado"]').exists()).toBe(true);
  expect(w.find('a[href="/revisiones/listado?status=inactive"]').exists()).toBe(true);w.unmount();
 });
 it('applies history and all supported filters once, converts Hermosillo dates',async()=>{
  const w=mount(InspectionAnalyticsView,{global:globals});await flushPromises();
  const selects=w.findAll('form select');await selects[0]!.setValue('history');await selects[1]!.setValue('t1');await selects[2]!.setValue('c1');await selects[3]!.setValue('inactive');await selects[4]!.setValue('week');
  const dates=w.findAll('input[type="date"]');await dates[0]!.setValue('2026-10-01');await dates[1]!.setValue('2026-10-16');
  expect(service.rvAnalytics).toHaveBeenCalledTimes(1);await w.find('form').trigger('submit');await flushPromises();
  expect(service.rvAnalytics).toHaveBeenCalledTimes(2);expect(service.rvAnalytics.mock.calls[1]![0]).toEqual({mode:'history',grain:'week',userId:'t1',crewId:'c1',status:'inactive',from:'2026-10-01T07:00:00.000Z',to:'2026-10-17T07:00:00.000Z'});w.unmount();
 });
 it('renders empty Pareto and empty response without claiming physical health',async()=>{
  service.rvAnalytics.mockResolvedValue(empty());const w=mount(InspectionAnalyticsView,{global:globals});await flushPromises();
  expect(w.text()).toContain('Sin revisiones evaluables');expect(w.text()).toContain('Sin hallazgos registrados');expect(w.text()).toContain('no certifica');w.unmount();
 });
 it('preserves no aplica and sin dato and all inventory options',()=>{
  const d=populated();const w=mount(InspectionAnalyticsCharts,{props:{data:d},global:globals});
  expect(w.text()).toContain('No aplica 3');expect(w.text()).toContain('Sin dato 2');expect(w.findAll('option')).toHaveLength(d.distributions.length);
  expect(JSON.stringify(availabilityChart(d.distributions))).toContain('53.85');expect(JSON.stringify(paretoChart(d))).toContain('Chapas');expect(JSON.stringify(systemsChart(d))).toContain('Gabinete');w.unmount();
 });
 it('keeps parcel component counts separate and handles empty parcel data',()=>{
  const d=populated();d.parcelValves.components.observedValves=41;d.parcelValves.components.withoutPilot=12;
  const w=mount(InspectionAnalyticsQuality,{props:{quality:d.dataQuality,parcel:d.parcelValves,findings:d.findings}});
  expect(w.text()).toContain('Componentes observados41');expect(w.text()).toContain('Componentes sin piloto12');expect(w.text()).toContain('Hidrantes afectados');w.unmount();
  const e=mount(InspectionAnalyticsQuality,{props:{quality:d.dataQuality,parcel:empty().parcelValves,findings:d.findings}});expect(e.text()).toContain('ni componentes parcelarios observados');e.unmount();
 });
 it.each([422,503,401,403])('renders actionable HTTP %s errors',async status=>{
  const cause=new AxiosError('error');cause.response={status,data:{detail:'RV_ANALYTICS_SNAPSHOT_INVALID'},headers:{},statusText:'error',config:{headers:{} } as never};
  service.rvAnalytics.mockRejectedValue(cause);const w=mount(InspectionAnalyticsView,{global:globals});await flushPromises();
  expect(w.find('[role="alert"]').text()).toContain(analyticsError(cause));expect(w.text()).not.toContain('RV_ANALYTICS_SNAPSHOT_INVALID');w.unmount();
 });
 it('renders ten recent rows/cards with existing status labels and detail links',async()=>{
  service.inspections.mockResolvedValue({items:Array.from({length:10},(_,i)=>({inspectionId:'i'+i,accountNumber:'H'+i,technicianName:'Tecnico',crewName:'Cuadrilla',startedAt:'2026-10-16T07:00:00Z',updatedAt:'2026-10-16T07:00:00Z',status:'inactive',totalPhotos:1,revisionNumber:i,hasGps:false,hasSignal:false})),total:10,page:1,pageSize:10});
  const w=mount(InspectionAnalyticsView,{global:globals});await flushPromises();const body=w.findComponent(InspectionListBody);
  expect(body.findAll('tbody tr')).toHaveLength(10);expect(body.findAll('.review-card')).toHaveLength(10);expect(body.text()).toContain('Ausente');expect(body.find('a[href="/revisiones/i0"]').exists()).toBe(true);expect(w.find('.pagination').exists()).toBe(false);w.unmount();
 });
 it('uses an exclusive next-day upper bound across month/year boundaries',()=>{expect(localDateRange('2026-12-31','2026-12-31')).toEqual({from:'2026-12-31T07:00:00.000Z',to:'2027-01-01T07:00:00.000Z'});});
});
describe('request lifecycle',()=>{
 it('deduplicates in-flight requests and ignores stale successes/errors, retains old data on refresh',async()=>{
  const resolvers:((d:RvAnalyticsResponse)=>void)[]=[];service.rvAnalytics.mockImplementation(()=>new Promise<RvAnalyticsResponse>(resolve=>resolvers.push(resolve)));
  let state!:ReturnType<typeof useRvAnalytics>;
  const w=mount(defineComponent({setup(){state=useRvAnalytics();return()=>null;}}));
  const a=state.load({mode:'current',grain:'month'});await state.load({mode:'current',grain:'month'});expect(service.rvAnalytics).toHaveBeenCalledTimes(1);
  const b=state.load({mode:'history',grain:'month'});expect(service.rvAnalytics.mock.calls[0]![1].aborted).toBe(true);
  const fresh=populated();fresh.scope.mode='history';resolvers[1]!(fresh);await b;resolvers[0]!(empty());await a;expect(state.data.value?.scope.mode).toBe('history');
  service.rvAnalytics.mockRejectedValue(new Error('failed'));await state.load({mode:'current',grain:'day'});expect(state.data.value).toEqual(fresh);expect(state.error.value).not.toBe('');w.unmount();
 });
});

describe('navigation compatibility', () => {
 it('resolves the dashboard, full list and preserved module deep links', async () => {
  const {default: router} = await import('@/router');
  const routes: [string,string][] = [
   ['/revisiones','inspection-analytics'], ['/revisiones/listado','inspections'], ['/revisiones/i1','inspection-detail'], ['/revisiones/i1/comparar','inspection-compare'], ['/revisiones/archivo','inspection-archive'], ['/dashboard','dashboard'], ['/hidrantes','hydrants'], ['/fotografias','photos'], ['/mapa','global-map'], ['/diagnosticos','functional-diagnostics'], ['/levantamientos/bases','construction-surveys'], ['/levantamientos/nuevos-hidrantes','cabinets'], ['/usuarios','users'], ['/exportaciones','exports'],
  ];
  for (const [path,name] of routes) expect(router.resolve(path).name).toBe(name);
 });
});
