// Isolated browser fixtures; all API requests are intercepted, no SQL writes.
import { spawn } from 'node:child_process'
import { mkdirSync,writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright-core'
const origin='http://127.0.0.1:4177',dir='.artifacts/administration-ui'
mkdirSync(dir,{recursive:true})
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4177','--strictPort'],{windowsHide:true,stdio:'pipe',env:{...process.env,VITE_API_BASE_URL:'/api/v1',VITE_CONSTRUCTION_DATA_MODE:'api'}})
let logs='',browser
server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b)
const assert=(v,m)=>{if(!v)throw Error(m)}
const records={crews:{id:'c1',name:'Cuadrilla de prueba',isActive:true,userCount:2,openSessions:1},sessions:{id:'s1',name:'Técnico de prueba',status:'open',clientApp:'legacy_field',crewName:'Cuadrilla de prueba',startedAt:'2026-09-24T10:00:00Z',inspectionCount:1},devices:{id:'d1',name:'Técnico de prueba',blocked:false,platform:'android',clientApp:'legacy_field',model:'TEST',openSessions:1}}
const user={userId:'u1',fullName:'Técnico de prueba',email:'fixture@example.invalid',phone:'6000000000',isActive:true,crewId:'c1',crewName:'Cuadrilla de prueba',rowVersion:'0x0000000000000001',inspectionCount:2,sessionCount:1,activeSessionCount:1,deviceCount:1,recentInspections:[],recentSessions:[]}
const inspection={inspectionId:'i1',accountNumber:'FIXTURE-1',hydrantId:'h1',revisionNumber:1,checklistCode:'RV',checklistVersion:1,status:'submitted',photos:[],checklistItems:[{itemCode:'pressure',label:'Presión',fieldType:'number',answerId:'a1',valueNumber:0}]}
const results=[]
try{
  let ready=false
  for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error(logs);try{if((await fetch(origin)).ok){ready=true;break}}catch{/* Wait for the isolated server. */}await delay(250)}
  assert(ready,'Isolated Vite did not start')
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})})
  for(const role of ['admin','viewer'])for(const width of [1440,768,390]){
    const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],unexpected=[],writes=[]
    page.on('pageerror',e=>errors.push(e.message))
    const current=structuredClone(records)
    await context.addInitScript(()=>sessionStorage.setItem('ddr001.admin.refresh','fixture-refresh'))
    await context.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url()),p=url.pathname.replace('/api/v1','')
      if(url.origin!==origin)return route.abort()
      if(!url.pathname.startsWith('/api/'))return route.continue()
      const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
      if(p==='/admin/auth/refresh')return json({accessToken:'fixture-access',refreshToken:'fixture-refresh'})
      if(p==='/admin/auth/me')return json({kind:'admin',userId:'a1',role,tokenId:'t1'})
      if(p==='/admin/dashboard/filters')return json({technicians:[],crews:[{id:'c1',label:'Cuadrilla de prueba'}],statuses:['inactive','submitted']})
      if(p==='/admin/dashboard/users/u1')return json(user)
      if(p==='/admin/dashboard/construction/users/u1/access')return json({userId:'u1',constructionRole:'contractor',rowVersion:'0x0000000000000001',accessEnabled:true,ownSurveyCount:1})
      if(p.endsWith('/access-history')||p.endsWith('/users/u1/history'))return json({items:[]})
      if(p.startsWith('/admin/dashboard/inspections/'))return json(p.endsWith('/i2')?{...inspection,inspectionId:'i2',revisionNumber:2,checklistItems:[{...inspection.checklistItems[0],valueNumber:5}]}:inspection)
      if(p==='/admin/dashboard/hydrants/h1/inspections')return json({page:1,pageSize:100,total:2,items:[{inspectionId:'i1',revisionNumber:1},{inspectionId:'i2',revisionNumber:2,technicianName:'Otro técnico',startedAt:'2026-09-24'}]})
      const match=p.match(/^\/admin\/dashboard\/administration\/(crews|sessions|devices)(?:\/([^/]+))?(?:\/(block|revoke))?$/)
      if(match){const [,kind,id,command]=match
        if(req.method()!=='GET'){
          if(role!=='admin')return json({detail:'Forbidden'},403)
          const body=req.postDataJSON();writes.push({kind,command,body});assert(body.reason?.length>=3,'Missing reason');if(id)assert(body.rowVersion,'Missing version')
          if(command==='block')current.devices.blocked=body.blocked
          if(command==='revoke')current.sessions.status='revoked'
          if(kind==='crews')Object.assign(current.crews,{name:body.name,isActive:body.isActive??true})
          return json({id:id||'new-crew'})
        }
        const row={...current[kind],rowVersion:'0x0000000000000001',history:[]}
        return json(id?row:{page:1,pageSize:25,total:1,items:[row]})
      }
      if(p==='/admin/dashboard/administration/users'&&req.method()==='POST'){writes.push({kind:'users',body:req.postDataJSON()});return json({id:'u1'},201)}
      unexpected.push(req.method()+' '+p);return json({detail:'Unexpected fixture request'},500)
    })
    for(const [path,kind] of [['/cuadrillas','crews'],['/jornadas','sessions'],['/dispositivos','devices']]){
      await page.goto(origin+path)
      await page.getByRole('button',{name:'Abrir',exact:true}).click()
      await page.getByRole('heading',{name:'Historial administrativo'}).waitFor()
      if(role==='admin'){
        await page.getByLabel('Motivo',{exact:true}).fill('Cambio de prueba aislado')
        if(kind==='crews')await page.getByLabel('Nombre',{exact:true}).fill('Cuadrilla actualizada')
        const save=page.getByRole('button',{name:kind==='crews'?'Guardar':kind==='sessions'?'Confirmar revocación':'Confirmar bloqueo',exact:true})
        await save.click();await page.getByRole('status').filter({hasText:'Cambio guardado'}).waitFor()
      }else assert(await page.getByLabel('Motivo',{exact:true}).count()===0,'Viewer has mutation controls')
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert(!overflow,`${path} overflows at ${width}`)
      await page.screenshot({path:`${dir}/${role}-${width}-${kind}.png`,fullPage:true})
    }
    if(role==='admin'){
      await page.goto(origin+'/usuarios/nuevo');await page.getByLabel('Nombre',{exact:true}).fill('Nuevo técnico')
      await page.getByLabel('Correo',{exact:true}).fill('new@example.invalid');await page.getByLabel('Teléfono',{exact:true}).fill('6111111111')
      await page.getByLabel('Motivo',{exact:true}).fill('Alta de prueba aislada');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click()
      await page.waitForURL('**/usuarios/u1');await page.getByRole('heading',{name:'Administración del usuario'}).waitFor()
      await page.screenshot({path:`${dir}/${role}-${width}-user.png`,fullPage:true})
    }
    await page.goto(origin+'/revisiones/i1/comparar');await page.getByLabel('Comparar con').selectOption('i2');await page.getByRole('button',{name:'Comparar',exact:true}).click()
    await page.getByRole('cell',{name:'Presión pressure'}).waitFor();assert(await page.getByRole('cell',{name:'0',exact:true}).count()===1,'Zero was lost')
    assert(errors.length===0,errors.join('\n'));assert(unexpected.length===0,unexpected.join('\n'));if(role==='viewer')assert(!writes.length,'Viewer issued writes')
    results.push({role,width,writes:writes.length});await context.close()
  }
  writeFileSync(`${dir}/results.json`,JSON.stringify(results,null,2));console.log('Administration browser PASS',JSON.stringify(results))
}finally{await browser?.close();server.kill()}
