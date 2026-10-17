// Isolated controlled-contract mode of the existing Edge/Playwright infrastructure.
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
const fixture=JSON.parse(readFileSync('docs/rv-dashboard-analytics.example.json','utf8'));
const data=structuredClone(fixture);
data.summary={...data.summary,selectedInspections:12,selectedHydrants:12,evaluatedHydrants:11,hydrantsWithFindings:7,hydrantsWithoutFindings:4,findingCount:19,inactiveHydrants:1,catalogHydrants:20,coveragePercent:60};
data.pareto=data.findings.slice(0,6).map((f,i)=>({...f,affected:6-i,evaluated:11,percentage:27.27,cumulativeAffected:6+i,cumulativePercentage:40+i*12}));
data.systems=data.systems.map(s=>({...s,hydrantsAffected:4,hydrantsEvaluated:11,percentageAffected:36.36,findingCount:8}));
for (const d of data.distributions) {d.denominator=12;d.values=[{key:'true',label:'S?',count:7,percentage:58.33},{key:'false',label:'No',count:3,percentage:25},{key:'NO_APLICA',label:'No aplica',count:1,percentage:8.33},{key:'SIN_DATO',label:'Sin dato',count:1,percentage:8.33}];}
data.trend=[{date:'2026-10-01',inspections:12,hydrants:12,evaluated:11,affected:7,percentageAffected:63.64}];
const items=Array.from({length:10},(_,i)=>({inspectionId:'i'+i,hydrantId:'h'+i,accountNumber:'H-'+i,technicianName:'Tecnico TEST',crewName:'Cuadrilla TEST',revisionNumber:i+1,status:i===0?'inactive':'submitted',startedAt:'2026-10-16T07:00:00Z',updatedAt:'2026-10-16T07:00:00Z',totalPhotos:8,mandatoryPhotosCompleted:7,mandatoryPhotosRequired:7,mandatoryPhotosComplete:true,hasGps:true,hasSignal:true,signalGeneration:'4G'}));
const origin='http://127.0.0.1:4188',base='/ddr001/',artifacts='.artifacts/rv-analytics-edge';
mkdirSync(artifacts,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4188','--strictPort','--base',base],{windowsHide:true,stdio:'pipe',env:{...process.env,VITE_API_BASE_URL:'/api/v1'}});
let logs='',browser;server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
const assert=(value,message)=>{if(!value)throw Error(message);};
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const results=[];
try {
 for(let n=0;n<100;n++){try{if((await fetch(origin+base)).ok)break;}catch{/* server startup */}if(n===99)throw Error(logs);await delay(200);}
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,768,390]){
  const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[],requests=[];let responseMode='normal';
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/v1/**',async route=>{
   const u=new URL(route.request().url()),p=u.pathname;requests.push(p+u.search);
   if(p.endsWith('/auth/refresh'))return json(route,{accessToken:'mock-access',refreshToken:'mock-refresh'});
   if(p.endsWith('/auth/me'))return json(route,{kind:'admin',userId:'test',role:'admin',tokenId:'mock'});
   if(p.endsWith('/rv-analytics')){
    await delay(responseMode==='slow'?900:100);
    if(responseMode==='422'||responseMode==='503')return json(route,{title:'RV_ANALYTICS_SNAPSHOT_INVALID',status:Number(responseMode)},Number(responseMode));
    const result=structuredClone(responseMode==='empty'?fixture:data);result.scope.mode=u.searchParams.get('mode');
    if(result.scope.mode==='history')result.summary.findingCount=27;
    return json(route,result);
   }
   if(p.endsWith('/filters'))return json(route,{technicians:[{id:'t',label:'Tecnico TEST'}],crews:[{id:'c',label:'Cuadrilla TEST'}],statuses:['submitted','validated','inactive']});
   if(p.endsWith('/inspections'))return json(route,{items,page:1,pageSize:Number(u.searchParams.get('pageSize')),total:10});
   if(p.endsWith('/inspections/i0'))return json(route,{...items[0],inspectionTypeCode:'RV',checklistCode:'RV',checklistVersion:1,checklist:[],photos:[],locations:[],signals:[],versions:[]});
   return json(route,{title:'Controlled unavailable resource'},404);
  });
  await page.goto(origin+base+'favicon.svg');await page.evaluate(()=>sessionStorage.setItem('ddr001.admin.refresh','mock-refresh'));
  responseMode='slow';await page.goto(origin+base+'revisiones');await page.locator('.rv-skeleton').first().waitFor();await page.screenshot({path:`${artifacts}/${width}-loading.png`,fullPage:true});responseMode='normal';
  await page.locator('.rv-kpi').first().waitFor();assert(requests.filter(p=>p.includes('/rv-analytics')).length===1,'one initial analytics request');
  for (const chart of await page.locator('.rv-chart').all()) { await chart.scrollIntoViewIfNeeded(); await chart.locator('canvas').first().waitFor({timeout:60000}); } await page.waitForTimeout(400);await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${artifacts}/${width}.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${width}: horizontal overflow`);
  assert(await page.locator('.rv-kpi').count()===6,'six summary cards');
  await page.getByLabel('Modo',{exact:true}).selectOption('history');await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.rv-notice')!==null);assert(requests.filter(p=>p.includes('/rv-analytics')).length===2,'one analytics request per apply');
  assert(await page.locator('.rv-kpis').innerText().then(t=>t.includes('27')),'updated server summary');
  await page.getByRole('link',{name:'Ver todas las revisiones',exact:true}).click();await page.locator('.list-title').waitFor();assert(new URL(page.url()).pathname===base+'revisiones/listado','full list route');
  await page.reload();await page.locator('.list-title').waitFor();await page.locator('.list-actions a').first().click();await page.locator('.rv-kpi').first().waitFor();
  await page.locator(`.rv-analytics ${width===1440?'.desktop-table':'.mobile-list'} a[href="/ddr001/revisiones/i0"]`).first().click();await page.waitForURL('**/revisiones/i0');await page.goBack();await page.locator('.rv-kpi').first().waitFor();await page.reload();await page.locator('.rv-kpi').first().waitFor();
  for(const mode of ['422','503','empty']){responseMode=mode;await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click();if(mode==='empty'){await page.getByText('Sin revisiones evaluables para los filtros seleccionados.',{exact:true}).waitFor();}else{await page.locator('.error-box').waitFor();await page.screenshot({path:`${artifacts}/${width}-${mode}.png`,fullPage:true});await page.getByRole('button',{name:/Reintentar an/}).waitFor();}await page.waitForTimeout(150);}
  assert(!errors.length,errors.join('\n'));results.push({width,overflow:false,consoleErrors:errors,analyticsRequests:requests.filter(p=>p.includes('/rv-analytics')).length,mode:'controlled mock',navigation:true,refresh:true,errorsAndEmpty:true});await context.close();
 }
 writeFileSync(artifacts+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
} finally {await browser?.close();server.kill();}
