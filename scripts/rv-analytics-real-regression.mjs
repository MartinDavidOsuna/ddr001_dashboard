// Authenticated TEST module/photo smoke. Same Edge infrastructure, no mocks.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
const runtime=JSON.parse(readFileSync('C:/DEV/AQAGS/ddr001_api_rv/reports/rv-analytics/runtime.json','utf8'));
assert.equal(runtime.identity.databaseName,'DDR001_Hidrantes_TEST');assert.equal(runtime.apiOrigin,'http://127.0.0.1:3017');
const credentials=JSON.parse(readFileSync(process.env.RV_CERT_CREDENTIALS_FILE,'utf8'));
const root=runtime.apiOrigin+'/api/v1',app=runtime.frontendOrigin+'/ddr001',directory='.artifacts/rv-analytics-real';mkdirSync(directory,{recursive:true});
const result={modules:[],photos:[],browser:[],viewerReadOnly:false};
const save=()=>writeFileSync(directory+'/regression.json',JSON.stringify(result,null,2));
async function login(role){const r=await fetch(root+'/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:runtime.frontendOrigin},body:JSON.stringify(credentials[role])});assert.equal(r.status,200);return (await r.json()).accessToken;}
const admin=await login('admin'),viewer=await login('viewer');
async function get(path,token=admin){const r=await fetch(root+path,{headers:{Authorization:`Bearer ${token}`,Origin:runtime.frontendOrigin}});return {status:r.status,data:await r.json()};}
const endpoints=[['dashboard','/admin/dashboard/summary'],['hydrants','/admin/dashboard/hydrants'],['photos','/admin/dashboard/photos'],['export filters','/admin/dashboard/filters'],['users','/admin/dashboard/users'],['crews','/admin/dashboard/administration/crews'],['sessions','/admin/dashboard/administration/sessions'],['devices','/admin/dashboard/administration/devices'],['map','/admin/dashboard/map/hydrants'],['diagnostics','/admin/dashboard/functional-diagnostics/cases'],['bases','/admin/dashboard/construction/surveys'],['cabinets','/admin/dashboard/construction/cabinets']];
for(const [module,path] of endpoints){const r=await get(path);result.modules.push({module,status:r.status});save();assert.equal(r.status,200,module);}
const forbidden=await get('/admin/dashboard/inspection-withdrawals',viewer);assert.equal(forbidden.status,403);result.viewerReadOnly=true;
const gallery=await get('/admin/dashboard/photos?page=1&pageSize=40',viewer);
const photo=gallery.data.items.find(p=>p.uploadStatus==='verified');assert(photo,'No verified metadata for photo smoke');
for(const kind of ['thumbnail','content']) {
 const url=photo[kind==='thumbnail'?'thumbnailUrl':'contentUrl'];assert(url.startsWith('/admin/dashboard/'));
 const response=await fetch(root+url,{headers:{Authorization:`Bearer ${viewer}`,Origin:runtime.frontendOrigin}});
 const bytes=(await response.arrayBuffer()).byteLength;
 result.photos.push({kind,status:response.status,mime:response.headers.get('content-type'),bytes});save();
}
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app+'/login?redirect=/revisiones');await page.locator('input[type=email]').fill(credentials.admin.email);await page.locator('input[type=password]').fill(credentials.admin.password);
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.locator('.rv-kpi').first().waitFor();
 for(const path of ['/dashboard','/hidrantes','/fotografias','/exportaciones','/usuarios','/cuadrillas','/jornadas','/dispositivos','/mapa','/diagnosticos','/levantamientos/bases','/levantamientos/nuevos-hidrantes']) {
  const me=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/admin/auth/me')&&r.status()===200);
  await page.goto(app+path);await (await me).finished();await page.waitForFunction(()=>document.querySelector('main h1')?.textContent?.trim());
  assert(!page.url().includes('/login'));result.browser.push({path,authenticated:true});save();
 }
 await page.goto(app+'/fotografias');await page.locator('.photo-card .preview').first().waitFor();
 await page.locator('.photo-card .preview').nth(gallery.data.items.indexOf(photo)).click();await page.locator('.image-viewer').waitFor();
 await page.waitForFunction(()=>{const image=document.querySelector('.image-viewer .viewer-stage img');return image?.complete && image.naturalWidth>0;});
 await page.screenshot({path:directory+'/photo-viewer-real.png'});
 await page.keyboard.press('Escape');await page.locator('.image-viewer').waitFor({state:'hidden'});
 const loggedOut=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/admin/auth/logout'));
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();assert.equal((await loggedOut).status(),204);await page.waitForURL('**/login');result.logout=true;
 await page.locator('input[type=email]').fill(credentials.admin.email);await page.locator('input[type=password]').fill(credentials.admin.password);
 const me=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/admin/auth/me')&&r.status()===200);
 await page.getByRole('button',{name:'Ingresar',exact:true}).click();await me;result.relogin=true;
 assert.equal(errors.length,0);result.pageErrors=errors;
 await context.close();
} finally {await browser.close();save();}
console.log(JSON.stringify(result,null,2));
