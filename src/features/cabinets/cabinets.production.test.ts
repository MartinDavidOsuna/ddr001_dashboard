import { flushPromises,mount } from '@vue/test-utils';
import { describe,it,expect,vi } from 'vitest';
import {createMemoryHistory,createRouter} from 'vue-router';
import Dashboard from './CabinetDashboardSection.vue';
import {cabinetsApi} from './cabinets.api';
import {readQuery,writeQuery,filterParams} from './cabinets.query';
import fixture from '../../../tests/fixtures/cabinets.json';
vi.mock('./cabinets.api',()=>({cabinetsApi:{summary:vi.fn(),metrics:vi.fn()}}));
describe('Catalog production and missing units',()=>{
 it('renders API targets and percentages; missing rows sort and navigate using stable identity',async()=>{
  const router=createRouter({history:createMemoryHistory(),routes:[{path:'/levantamientos/nuevos-hidrantes',component:Dashboard}]});await router.push('/levantamientos/nuevos-hidrantes');
  vi.mocked(cabinetsApi.summary).mockResolvedValue({...fixture.summary,productionTarget:80,produced:20,productionPercent:25});
  const row={partCode:'A1.key.1512496',canonicalPartKey:'A1.key.1512496',displayName:'Válvula TEST',model:'A1',automated:false,missingUnits:8,affectedCabinets:7,confirmedAbsentUnits:6,notReviewedUnits:2};
  vi.mocked(cabinetsApi.metrics).mockResolvedValue({...fixture.metrics,models:fixture.metrics.models.map(m=>({...m,productionTarget:20,produced:5,productionPercent:25,remainingToProduce:15})),missingParts:[{...row,partCode:'A1.key.other',missingUnits:2},row]});
  const w=mount(Dashboard,{global:{plugins:[router],stubs:{EChart:true}}});await flushPromises();
  expect(w.text()).toContain('AVANCE DE PRODUCCIÓN');expect(w.text()).toContain('20 / 80');expect(w.text()).toContain('5 / 20');expect(w.text()).toContain('25%');
  const links=w.findAll('a').filter(a=>a.text()==='Válvula TEST');expect(links[0]!.attributes('href')).toContain('missingPartCode=A1.key.1512496');
  await links[0]!.trigger('click');await flushPromises();expect(router.currentRoute.value.query.missingPartCode).toBe(row.partCode);
  w.unmount();
 });
 it('round trips missing identity through URL and server params, never display text',()=>{
  const filters=readQuery({missingPartCode:'A3.key.1511636',model:'A3'}).filters;
  expect(writeQuery(filters,2,10).missingPartCode).toBe('A3.key.1511636');
  expect(filterParams(filters).missingPartCode).toBe('A3.key.1511636');
 });
});
