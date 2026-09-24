import type { ChecklistItem, InspectionDetail } from '@/api/types'
import { answerDisplay } from './inspection-format'
function answer(item?:ChecklistItem) {
  if(!item)return 'No existe en esta versión'
  if(item.isNotApplicable)return 'No aplica'
  return answerDisplay(item)
}
export function compareInspections(left:InspectionDetail,right:InspectionDetail) {
  const a=new Map(left.checklistItems.map(x=>[x.itemCode,x])),b=new Map(right.checklistItems.map(x=>[x.itemCode,x]))
  return [...new Set([...a.keys(),...b.keys()])].map(code=>{
    const first=a.get(code),second=b.get(code),l=answer(first),r=answer(second)
    return {code,label:second?.label||first?.label||code,left:l,right:r,changed:l!==r,definitionChanged:!!first&&!!second&&(first.label!==second.label||first.fieldType!==second.fieldType||first.unit!==second.unit)}
  })
}
