// Real TEST certification. No mock responses, generated JWTs or account changes.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { loadEnv } from 'vite';

const apiRepo = process.env.RV_CERT_API_REPO || 'C:/DEV/AQAGS/ddr001_api_rv';
const runtime = JSON.parse(readFileSync(resolve(apiRepo,'reports/rv-analytics/runtime.json'),'utf8'));
const sql = JSON.parse(readFileSync(resolve(apiRepo,'reports/rv-analytics/sql.json'),'utf8'));
assert.equal(runtime.identity.databaseName,'DDR001_Hidrantes_TEST');
assert.equal(runtime.identity.compatibility,120);
assert.equal(runtime.workers,false);
assert.equal(runtime.apiOrigin,'http://127.0.0.1:3017');
assert.equal(runtime.frontendOrigin,'http://127.0.0.1:4189');
const local = loadEnv('rv-cert',apiRepo,'E2E_');
const credentials = process.env.RV_CERT_CREDENTIALS_FILE
  ? JSON.parse(readFileSync(process.env.RV_CERT_CREDENTIALS_FILE,'utf8'))
  : Object.fromEntries(['viewer','supervisor','admin'].map(role=>[role,{
    email:process.env[`E2E_${role.toUpperCase()}_EMAIL`] || local[`E2E_${role.toUpperCase()}_EMAIL`],
    password:process.env[`E2E_${role.toUpperCase()}_PASSWORD`] || local[`E2E_${role.toUpperCase()}_PASSWORD`],
  }]));
const artifacts = '.artifacts/rv-analytics-real';mkdirSync(artifacts,{recursive:true});
const app = runtime.frontendOrigin + '/ddr001';
const root = runtime.apiOrigin + '/api/v1';
let results = {identity:runtime.identity,timestamp:new Date().toISOString(),roles:[],matrix:[],performance:[],viewports:[],coverageLimitations:[]};
const resumeUi=process.argv.includes('--rv-ui-only');
if(resumeUi){results=JSON.parse(readFileSync(artifacts+'/results.json','utf8'));results.viewports=[];results.uiResumedAfterLayoutFix=true;}
const checkpoint=()=>writeFileSync(artifacts+'/results.json',JSON.stringify(results,null,2));
const availableRoles = ['viewer','supervisor','admin'].filter(role=>credentials[role]?.email && credentials[role]?.password);
assert(availableRoles.length,'No configured TEST accounts');
for (const role of ['viewer','supervisor','admin']) if (!availableRoles.includes(role)) results.coverageLimitations.push(`No TEST credentials for ${role}`);
async function call(path, token, init={}) {
  const start=performance.now();
  const response=await fetch(root+path,{...init,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),Origin:runtime.frontendOrigin,...init.headers}});
  const text=await response.text();
  return {status:response.status,data:JSON.parse(text),milliseconds:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),allowOrigin:response.headers.get('access-control-allow-origin')};
}
let token,current;
const sample=sql.filters[0] || {};
if(!resumeUi){
for (const role of availableRoles) {
  const login=await call('/admin/auth/login',null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials[role])});
  assert.equal(login.status,200,`${role}: login rejected`);assert.equal(login.allowOrigin,runtime.frontendOrigin);
  const me=await call('/admin/auth/me',login.data.accessToken);assert.equal(me.status,200);assert.equal(me.data.role,role);
  const analytics=await call('/admin/dashboard/rv-analytics?mode=current',login.data.accessToken);assert.equal(analytics.status,200);assert.equal(analytics.data.contractVersion,1);
  if(role==='viewer') {
    const denied=await call('/admin/dashboard/inspection-withdrawals',login.data.accessToken);
    assert.equal(denied.status,403,'Viewer administrative read-only policy');
  }
  results.roles.push({role,login:200,me:200,analytics:200,cors:true});
  checkpoint();console.log(`PASS TEST authentication/analytics: ${role}`);
  token ??= login.data.accessToken;
}
const queries=[['current','mode=current'],['history','mode=history'],['submitted','status=submitted'],['validated','status=validated'],['inactive','status=inactive'],['day','grain=day'],['week','grain=week'],['month','grain=month'],['period','from=2026-09-01T07%3A00%3A00.000Z&to=2026-11-01T07%3A00%3A00.000Z'],['empty','from=1900-01-01T07%3A00%3A00.000Z&to=1900-01-02T07%3A00%3A00.000Z'],...(sample.userId?[['technician','userId='+sample.userId]]:[]),...(sample.crewId?[['crew','crewId='+sample.crewId]]:[])];
for(const [scenario,query] of queries) {
  const response=await call('/admin/dashboard/rv-analytics?'+query,token);assert.equal(response.status,200,scenario);
  for(const block of ['scope','summary','findings','pareto','systems','distributions','trend','dataQuality','parcelValves']) assert(block in response.data,`${scenario}: ${block}`);
  assert(!JSON.stringify(response.data).includes('NaN'));
  results.matrix.push({scenario,status:200,hydrants:response.data.summary.selectedHydrants,inspections:response.data.summary.selectedInspections,bytes:response.bytes,milliseconds:response.milliseconds});
  checkpoint();console.log(`PASS TEST analytics filter: ${scenario}`);
  if(scenario==='current') current=response.data;
}
for(const metric of sql.metrics) {
  const api=current.findings.find(f=>f.itemCode===metric.code);assert(api);
  for(const key of ['affected','evaluated','percentage','notApplicable','noData','unavailable']) assert.equal(api[key],metric[key],`SQL->HTTP ${metric.code}.${key}`);
}
writeFileSync(artifacts+'/api-current.json',JSON.stringify(current,null,2));
for(const scenario of ['current','period','crew','history']) {
  const query=queries.find(q=>q[0]===scenario)?.[1];if(!query)continue;
  const samples=[];
  for(let i=0;i<5;i++){const r=await call('/admin/dashboard/rv-analytics?'+query,token);assert.equal(r.status,200);samples.push(r);}
  const times=samples.map(s=>s.milliseconds).sort((a,b)=>a-b);
  results.performance.push({scenario,concurrency:1,samples:5,p50:times[2],p95Approximate:times[4],maximum:times[4],bytes:samples[0].bytes,hydrants:samples[0].data.summary.selectedHydrants,inspections:samples[0].data.summary.selectedInspections});
  checkpoint();console.log(`PASS TEST latency samples: ${scenario}`);
}
const concurrent=await Promise.all(Array.from({length:3},()=>call('/admin/dashboard/rv-analytics?mode=current',token)));
concurrent.forEach(r=>assert.equal(r.status,200));
results.performance.push({scenario:'current concurrent',concurrency:3,samples:3,latencies:concurrent.map(r=>r.milliseconds),maximum:Math.max(...concurrent.map(r=>r.milliseconds)),bytes:concurrent[0].bytes,hydrants:concurrent[0].data.summary.selectedHydrants,inspections:concurrent[0].data.summary.selectedInspections});

} else {
 current=JSON.parse(readFileSync(artifacts+'/api-current.json','utf8'));
 const login=await call('/admin/auth/login',null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials[availableRoles[0]])});assert.equal(login.status,200);token=login.data.accessToken;
}
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const width of [1440,768,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[];let analyticsCalls=0;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/rv-analytics'))analyticsCalls++;});
  async function navigate(path,reload=false) {
    const restored=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/admin/auth/me')&&r.status()===200);
    if(reload)await page.reload();else await page.goto(app+path);
    await (await restored).finished();
    await page.waitForFunction(()=>document.querySelector('main h1')?.textContent?.trim());
    assert(!page.url().includes('/login'),'Authenticated navigation: '+path);
  }
  await page.goto(app+'/login?redirect=/revisiones');
  const role=availableRoles[0];await page.getByLabel('Correo electrónico').fill(credentials[role].email);await page.getByLabel('Contraseña',{exact:true}).fill(credentials[role].password);
  const initial=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/rv-analytics')&&r.status()===200);
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();await initial;await page.locator('.rv-kpi').first().waitFor();assert.equal(analyticsCalls,1);
  const kpiValues=[current.summary.evaluatedHydrants,current.summary.hydrantsWithFindings,current.summary.hydrantsWithoutFindings,current.summary.findingCount,current.summary.inactiveHydrants,current.summary.coveragePercent];
  assert.equal(await page.locator('.rv-kpi').count(),6);
  for(let i=0;i<kpiValues.length;i++)assert((await page.locator('.rv-kpi strong').nth(i).innerText()).includes(kpiValues[i].toLocaleString('es-MX')),'SQL/API->KPI');
  for(const metric of sql.metrics) {
    const finding=current.findings.find(f=>f.itemCode===metric.code);
    if(current.pareto.some(f=>f.code===finding.code)) {
      const detail=page.locator('details').filter({has:page.getByText('Ver valores del Pareto',{exact:true})});
      await detail.locator('summary').click();
      const text=await detail.locator('li').filter({hasText:finding.label}).first().textContent();
      for(const value of [`${finding.affected} / ${finding.evaluated}`,`${finding.percentage}%`,`No aplica ${finding.notApplicable}`,`Sin dato ${finding.noData}`])assert(text?.includes(value),'SQL/API->UI '+finding.code);
      await detail.locator('summary').click();
    }
  }
  for(const chart of await page.locator('.rv-chart').all()){await chart.scrollIntoViewIfNeeded();if(await chart.locator('.chart').count())await chart.locator('canvas').first().waitFor({timeout:60000});}
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${artifacts}/${width}.png`,fullPage:true});
  const geometry=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert(geometry.width<=geometry.viewport+2,'Horizontal overflow: '+JSON.stringify(geometry));
  const before=analyticsCalls;await page.getByLabel('Modo',{exact:true}).selectOption('history');
  const changed=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/rv-analytics')&&r.status()===200);
  await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click();await changed;assert.equal(analyticsCalls,before+1);
  const filterCases = [
    ['grain',()=>page.getByLabel('Agrupar por',{exact:true}).selectOption('week')],
    ['status',()=>page.getByLabel('Estado',{exact:true}).selectOption('submitted')],
    ...(sample.userId?[['technician',()=>page.getByLabel('Técnico',{exact:true}).selectOption(sample.userId)]]:[]),
    ...(sample.crewId?[['crew',()=>page.getByLabel('Cuadrilla',{exact:true}).selectOption(sample.crewId)]]:[]),
    ['period',async()=>{await page.getByLabel('Desde',{exact:true}).fill('2026-01-01');await page.getByLabel('Hasta',{exact:true}).fill('2026-12-31');}],
  ];
  for(const [name,edit] of filterCases) {
    await edit();const prior=analyticsCalls;
    const completed=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/rv-analytics')&&r.status()===200);
    await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click();
    await page.getByText('Actualizando…',{exact:true}).waitFor();
    await completed;assert.equal(analyticsCalls,prior+1,`${name}: one request`);
  }
  const recent=await call('/admin/dashboard/inspections?page=1&pageSize=10',token);assert.equal(recent.status,200);assert(recent.data.items.length<=10);
  assert.equal(await page.locator('.desktop-table tbody tr').count(),recent.data.items.length);
  assert.equal(await page.locator('.mobile-list .review-card').count(),recent.data.items.length);
  for(let i=1;i<recent.data.items.length;i++)assert(Date.parse(recent.data.items[i-1].startedAt)>=Date.parse(recent.data.items[i].startedAt),'Recent order');
  await page.getByRole('link',{name:'Ver todas las revisiones',exact:true}).click();await page.locator('.list-title').waitFor();await navigate('/revisiones/listado',true);await page.locator('.list-title').waitFor();
  if(recent.data.items.length){const id=recent.data.items[0].inspectionId;for(const path of [`/revisiones/${id}`,`/revisiones/${id}/comparar`]){await navigate(path);await navigate(path,true);}}
  for(const path of ['/revisiones','/revisiones/listado','/revisiones/archivo']){await navigate(path);await navigate(path,true);}
  // Representative authenticated, read-only module regression; actual responses.
  for(const path of ['/dashboard','/hidrantes','/fotografias','/exportaciones','/usuarios','/cuadrillas','/jornadas','/dispositivos','/mapa','/diagnosticos','/levantamientos/bases','/levantamientos/nuevos-hidrantes']) {
    await navigate(path);await page.locator('main').first().waitFor();
  }
  assert.equal(errors.length,0,'Browser errors');results.viewports.push({width,mode:'real TEST',overflow:false,pageErrors:0,initialAnalyticsCalls:1,filterAnalyticsCalls:1,refresh:true,recentCount:recent.data.items.length});checkpoint();console.log(`PASS real TEST UI: ${width}`);await context.close();
 }
} finally {await browser.close();writeFileSync(artifacts+'/results.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
