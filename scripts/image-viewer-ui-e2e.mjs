import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { checkViewer } from './image-viewer-assertions.mjs';
const origin = 'http://127.0.0.1:4178', base = '/ddr001', artifacts = '.artifacts/image-viewer-ui';
mkdirSync(artifacts, { recursive: true });
const cabinets = JSON.parse(readFileSync('tests/fixtures/cabinets.json', 'utf8'));
const root = '/api/v1/admin/dashboard/construction/cabinets';
// Small synthetic JPEGs: portrait stored landscape with EXIF orientation 6, and a large landscape.
const portrait = readFileSync('tests/fixtures/viewer-portrait-exif.jpg');
const landscape = readFileSync('tests/fixtures/viewer-landscape.jpg');
const photo = { photoId: 'photo-a', slotCode: 'TEST', slotLabel: 'Fotografía de prueba', category: 'additional', isMandatory: false, mimeType: 'image/jpeg', uploadStatus: 'verified', capturedAt: '2026-10-14T12:00:00Z', thumbnailUrl: '/admin/dashboard/photos/a/thumbnail', contentUrl: '/admin/dashboard/photos/a/content', widthPx: 1440, heightPx: 1920, hydrantId: 'hydrant-a', inspectionId: 'inspection-a', accountNumber: 'TEST', revisionNumber: 1, technicianName: 'Actor de prueba', crewName: 'Brigada de prueba' };
const survey = { survey: { surveyId: 'survey-a', displayIdentifier: 'BASE TEST', status: 'executed', currentStep: 6, createdAt: photo.capturedAt, updatedAt: photo.capturedAt, photoCount: 1 }, steps: [{ stepNumber: 6, stepName: 'Terminado', status: 'completed' }], photos: [{ photoId: 'photo-a', surveyId: 'survey-a', stepNumber: 6, storageState: 'verified', integrityStatus: 'confirmed', capturedAt: photo.capturedAt }], corrections: [], history: [] };
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4178', '--strictPort', '--base', base + '/'], { windowsHide: true, stdio: 'pipe', env: { ...process.env, VITE_API_BASE_URL: '/api/v1', VITE_CONSTRUCTION_DATA_MODE: 'api' } });
let logs = '', browser;
server.stdout.on('data', b => logs += b); server.stderr.on('data', b => logs += b);
const results = [];
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(origin)).ok) break; } catch { /* local startup */ } if (i === 79) throw Error(logs); await delay(200); }
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  for (const width of [1440, 1024, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, hasTouch: width === 390, isMobile: width === 390 });
    let originals = 0;
    const errors = [], unexpected = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      if (url.origin !== origin) return route.abort();
      const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (path === '/api/v1/admin/auth/refresh') return json({ accessToken: 'mock-token', refreshToken: 'mock-refresh' });
      if (path === '/api/v1/admin/auth/me') return json({ kind: 'admin', role: 'admin', userId: 'mock-admin', tokenId: 'mock-token' });
      if (path.endsWith('/content') || path.endsWith('/thumbnail')) { if (path.endsWith('/content')) originals++; return route.fulfill({ contentType: 'image/jpeg', body: path.includes('/photos/b/') ? landscape : portrait }); }
      if (path === '/api/v1/admin/dashboard/photos/filters') return json({ slots: [], technicians: [], crews: [], statuses: [] });
      if (path === '/api/v1/admin/dashboard/photos') return json({ page: 1, pageSize: 40, total: 2, items: [photo, { ...photo, photoId: 'photo-b', contentUrl: '/admin/dashboard/photos/b/content' }] });
      if (path === root + '/' + cabinets.row.cabinetId) return json(cabinets.dossier);
      if (path === '/api/v1/admin/dashboard/construction/surveys/survey-a') return json(survey);
      if (path.startsWith('/api/')) { unexpected.push(path); return route.fulfill({ status: 500, body: '{}' }); }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/favicon.svg'); await page.evaluate(() => sessionStorage.setItem('ddr001.admin.refresh', 'mock-refresh'));
    for (const [name, path, selector] of [['gallery', '/fotografias', '.preview'], ['cabinets', '/levantamientos/nuevos-hidrantes/' + cabinets.row.cabinetId, '.cabinet-photo-button'], ['bases', '/levantamientos/bases/survey-a', '.construction-photo']]) {
      const before = originals;
      await page.goto(origin + base + path); await page.locator(selector).first().waitFor();
      assert.equal(originals, before, 'Original must load only on open');
      await page.locator(selector).first().click(); await checkViewer(page, width);
      if (name === 'gallery') {
        await page.getByRole('button', { name: 'Acercar', exact: true }).click();
        await page.locator('.image-viewer[open]').getByRole('button', { name: 'Siguiente', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.image-viewer[open] img')?.naturalWidth === 4000);
        await checkViewer(page, width);
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction(() => document.querySelector('.image-viewer[open] img')?.naturalWidth === 1440);
        assert.equal(await page.locator('.image-viewer[open] .viewer-stage').getAttribute('data-pan-x'), '0');
      }
      await page.screenshot({ path: `${artifacts}/${name}-${width}.png` });
      await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await page.locator('.image-viewer[open]').waitFor({ state: 'hidden' });
      results.push({ name, width, result: 'PASS', mode: 'mock HTTP / real browser' });
    }
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []); await context.close();
  }
  writeFileSync(`${artifacts}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} photo viewer journeys, /ddr001/, 1440/1024/768/390`);
} finally { await browser?.close(); server.kill(); }
