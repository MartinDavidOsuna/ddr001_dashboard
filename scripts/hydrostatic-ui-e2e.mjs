import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const origin='http://127.0.0.1:5176';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','5176','--base=/ddr001/'],{env:{...process.env,VITE_API_BASE_URL:origin+'/api/v1'},stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let browser;
const summary={attempts:2,cabinets:1,latestPass:1,latestLeak:0,discarded:0,pending:0,evidencePending:1,withVerifiedPhotos:1,requiresReview:0,averageDurationMs:60000,averageAttempts:2,firstAttemptPassPercent:0,firstAttemptDenominator:1,firstAttemptPass:0,completedResults:2,leakAttempts:1,leakPercent:50,coverage:[{classification:'SYNTHETIC',count:2}],classificationWarning:'Certificación UI sintética. No son datos operativos.',definitions:{leak:'Intentos FUGA / resultados terminados. Descartadas excluidas.'}};
const attempt={testId:'00000001-0000-4000-8000-000000000001',cabinetId:'00000002-0000-4000-8000-000000000001',originCabinetId:'00000002-0000-4000-8000-000000000001',uid:'AQ00000001',model:'A1',attemptNumber:2,actor:{id:'synthetic',name:'Operador de certificación'},startedAt:'2026-10-01T18:00:00Z',endedAt:'2026-10-01T18:01:00Z',durationMs:'60000',result:'PASS',leakCount:0,evidenceCount:2,verifiedCount:2,timeState:'CONSISTENT',recoveryState:'CLEAN',validationState:'HISTORY_PENDING',classification:'SYNTHETIC',documentReceived:true,serverVersion:2,sourceRevision:3,receivedAt:'2026-10-02T18:00:00Z',videoDeclaration:'DECLARED_SENT',videoLinkState:'UNLINKED'};
const photo=n=>({id:`0000000${n}-0000-4000-8000-000000000001`,role:n===3?'INITIAL_SETUP':'FINAL4_BAR',byteLength:'68',capturedAt:attempt.startedAt,location:null,uploadState:'STORED',integrityState:'VERIFIED',verified:true,thumbnailAvailable:true,joints:[]});
const metrics={joints:Array.from({length:11},(_,i)=>({code:'J'+String(i+1).padStart(2,'0'),name:'Unión '+(i+1),events:i===2?1:0,attempts:i===2?1:0,averageMillibar:i===2?2500:null,modalPressures:i===2?[{millibar:2500,events:1}]:[]})),pressures:[{millibar:2500,events:1,attempts:1}],daily:[{day:'2026-10-01',attempts:2,passed:1,leaks:1,discarded:0}],operators:[{id:'synthetic',name:'Operador de certificación',attempts:2}],models:[{model:'A1',attempts:2}],cabinets:[{uid:attempt.uid,attempts:2,averageDurationMs:60000,firstPassAt:attempt.startedAt,attemptsToFirstPass:2}],multipleLeakAttempts:0};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6TnAAAAAASUVORK5CYII=','base64');
const results=[];
try{
 for(let i=0;i<80;i++){try{if((await fetch(origin+'/ddr001/')).ok)break;}catch{ /* Wait for this isolated Vite instance. */ }if(i===79)throw Error('Vite unavailable');await delay(250);}
 browser=await chromium.launch({headless:true});
 for(const width of [1440,768]){
 const context=await browser.newContext({viewport:{width,height:1000}});let role='admin',hydroReads=0;
 await context.addInitScript(()=>sessionStorage.setItem('ddr001.admin.refresh','synthetic-local-fixture'));
 await context.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.protocol==='http:'&&u.origin!==origin)return route.abort();
 if(!u.pathname.startsWith('/api/v1/'))return route.continue();
 const p=u.pathname;let data={};
 if(p.endsWith('/auth/refresh'))data={accessToken:'synthetic-local-fixture',refreshToken:'synthetic-local-fixture'};
 else if(p.endsWith('/auth/me'))data={userId:'synthetic',role,name:'Certificación HAPI-5'};
 else if(p.includes('/hydrostatic-tests')){hydroReads++;
 if(p.endsWith('/original')||p.endsWith('/thumbnail'))return route.fulfill({status:200,contentType:'image/png',body:png});
 if(p.endsWith('/video'))data={declaration:'DECLARED_SENT',declaredAt:null,link:null,maxBytes:104857600};
 else if(p.endsWith('/summary'))data=summary;
 else if(p.endsWith('/metrics'))data=metrics;
 else if(p.endsWith('/history'))data={items:[{id:'9007199254740993',kind:'AUDIT',action:'REGISTER_DOCUMENT',receivedAt:attempt.receivedAt}],hasMore:false};
 else if(p.endsWith('/evidences'))data={items:[photo(3),photo(4)],hasMore:false};
 else if(p.endsWith('/tests'))data={items:[attempt],total:1,page:1,pageSize:25};
 else data={...attempt,leaks:[],pendingHistorySegments:2,videoPolicy:{message:'Carga y asociación bloqueadas: contrato de almacenamiento pendiente.',linkingEnabled:false},notice:'Resultado declarado; no certificación hidráulica automática.'};
 }
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/ddr001/levantamientos/nuevos-hidrantes/hidrostaticas');await page.getByRole('heading',{name:'Pruebas Hidrostáticas',exact:true}).waitFor();await page.getByRole('link',{name:'Ver intento',exact:true}).waitFor();
 for(const chart of await page.locator('.hydro-chart').all()){await chart.scrollIntoViewIfNeeded();await chart.locator('canvas').waitFor();}
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`/tmp/hapi5-list-${width}.png`,fullPage:true});
 await page.getByRole('link',{name:'Ver intento',exact:true}).click();await page.getByRole('heading',{name:'Video de WhatsApp'}).waitFor();
 await page.getByText('9007199254740993',{exact:false}).waitFor();
 await page.locator('.hydro-photo button').first().click();await page.locator('dialog[open]').waitFor();await page.waitForFunction(()=>document.querySelector('dialog[open] img')?.getAttribute('src')?.startsWith('blob:'));
 await page.screenshot({path:`/tmp/hapi5-gallery-${width}.png`});await page.keyboard.press('Escape');
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`/tmp/hapi5-detail-${width}.png`,fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('Page overflow '+width);if(errors.length)throw Error(errors.join('\n'));
 role='viewer';const before=hydroReads;await page.reload();await page.getByText('Acceso restringido',{exact:false}).first().waitFor();if(hydroReads!==before)throw Error('Viewer requested hydro data');
 results.push({width,navigation:true,detail:true,gallery:true,bigint:true,viewerBlocked:true,noPageOverflow:true});await context.close();
 }
 await writeFile('/tmp/hapi5-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser?.close();server.kill('SIGTERM');}
