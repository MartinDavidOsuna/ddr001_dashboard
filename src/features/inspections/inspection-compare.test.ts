import { describe,expect,it } from 'vitest'
import type { ChecklistItem,InspectionDetail } from '@/api/types'
import { compareInspections } from './inspection-compare'
const item=(itemCode:string,fields:Partial<ChecklistItem>={})=>({itemCode,label:itemCode,fieldType:'number',answerId:'answer',...fields} as ChecklistItem)
const detail=(checklistItems:ChecklistItem[])=>({checklistItems} as InspectionDetail)
describe('Historical comparison',()=>{
  it('preserves zero, false, N/A and missing version fields',()=>{
    const rows=compareInspections(detail([item('zero',{valueNumber:0}),item('flag',{fieldType:'boolean',valueBoolean:false}),item('removed')]),detail([item('zero',{isNotApplicable:true}),item('flag',{fieldType:'boolean',valueBoolean:false}),item('new')]));
    expect(rows.find(x=>x.code==='zero')).toMatchObject({left:'0',right:'No aplica',changed:true});
    expect(rows.find(x=>x.code==='flag')).toMatchObject({left:'No',right:'No',changed:false});
    expect(rows.find(x=>x.code==='removed')?.right).toBe('No existe en esta versión');
    expect(rows.find(x=>x.code==='new')?.left).toBe('No existe en esta versión');
  });
  it('flags altered question definitions even when displayed answers match',()=>{
    const [row]=compareInspections(detail([item('a',{label:'Old',valueNumber:4})]),detail([item('a',{label:'New',valueNumber:4})]));
    expect(row).toMatchObject({changed:false,definitionChanged:true});
  });
});
