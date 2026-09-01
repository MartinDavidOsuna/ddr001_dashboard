import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const appUrl = process.env.E2E_APP_URL || 'http://127.0.0.1:4173'
const artifactsDir = process.env.E2E_ARTIFACTS_DIR || '.artifacts/construction-ui'
const viewports = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
]
const views = [
  { path: '/dashboard', slug: 'dashboard', expected: ['Dashboard', 'Construcción de nuevos hidrantes'] },
  { path: '/levantamientos', slug: 'levantamientos', expected: ['Levantamientos', 'Listado de levantamientos'] },
  { path: '/levantamientos/mock-survey-4', slug: 'levantamiento-detalle', expected: ['BASE DEMO 04', 'Avance de construcción', 'Correcciones'] },
  { path: '/usuarios', slug: 'usuarios', expected: ['Usuarios', 'Rol Levantamientos'] },
  { path: '/usuarios/mock-user-1', slug: 'usuario-detalle', expected: ['Detalle de usuario', 'ACCESO A LEVANTAMIENTOS'] },
]

const summary = {
  totalHydrants: 12,
  reviewedHydrants: 5,
  pendingHydrants: 7,
  progressPercent: 41.7,
  totalInspections: 6,
  inspectionsToday: 1,
  verifiedPhotos: 42,
  byStatus: [
    { status: 'submitted', count: 4 },
    { status: 'validated', count: 2 },
  ],
  activity: [
    { date: '2026-08-28', count: 1 },
    { date: '2026-08-30', count: 2 },
    { date: '2026-09-01', count: 3 },
  ],
  byTechnician: [{ userId: 'mock-user-1', name: 'Usuario Demo', count: 6 }],
}
const filters = {
  technicians: [{ id: 'mock-user-1', label: 'Usuario Demo' }],
  crews: [{ id: 'rv-crew-demo', label: 'Cuadrilla RV Demo' }],
  statuses: ['submitted', 'validated'],
}
const user = {
  userId: 'mock-user-1',
  fullName: 'Usuario Demo',
  email: 'demo@example.invalid',
  phone: '0000000000',
  employeeNumber: 'DEMO-01',
  isActive: true,
  crewId: 'rv-crew-demo',
  crewName: 'Cuadrilla RV Demo',
  inspectionCount: 3,
  submittedCount: 3,
  validatedCount: 2,
  rejectedCount: 1,
  sessionCount: 2,
  activeSessionCount: 0,
  deviceCount: 1,
  firstActivityAt: '2026-08-01T10:00:00-06:00',
  lastActivityAt: '2026-08-30T10:00:00-06:00',
  createdAt: '2026-08-01T10:00:00-06:00',
  updatedAt: '2026-08-30T10:00:00-06:00',
}
const userDetail = { ...user, recentInspections: [], recentSessions: [] }

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

mkdirSync(artifactsDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const forbiddenRequests = []
const unexpectedApiRequests = []

await context.addInitScript(() => {
  sessionStorage.setItem('ddr001.admin.refresh', 'mock-refresh-token')
})

await context.route('**/*', async (route) => {
  const request = route.request()
  const url = new URL(request.url())

  if (url.hostname === 'cifra.aquafim.com') {
    forbiddenRequests.push(request.url())
    return route.abort()
  }
  if (url.hostname.endsWith('tile.openstreetmap.org')) return route.abort()
  if (url.origin !== appUrl) return route.continue()

  if (url.pathname === '/admin/auth/refresh') return json(route, { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' })
  if (url.pathname === '/admin/auth/me') return json(route, { kind: 'admin', userId: 'mock-admin', role: 'admin', tokenId: 'mock-token' })
  if (url.pathname === '/admin/dashboard/summary') return json(route, summary)
  if (url.pathname === '/admin/dashboard/filters') return json(route, filters)
  if (url.pathname === '/admin/dashboard/users/mock-user-1') return json(route, userDetail)
  if (url.pathname === '/admin/dashboard/users') return json(route, { page: 1, pageSize: 25, total: 1, items: [user] })

  if (url.pathname.startsWith('/admin/') || url.pathname.includes('/construction/')) {
    unexpectedApiRequests.push(`${request.method()} ${url.pathname}`)
    return json(route, { title: 'Unexpected mocked API request', status: 500 }, 500)
  }
  return route.continue()
})

try {
  for (const viewport of viewports) {
    const page = await context.newPage()
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const consoleErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    for (const view of views) {
      await page.goto(`${appUrl}${view.path}`, { waitUntil: 'domcontentloaded' })
      for (const text of view.expected) {
        await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 10_000 })
      }
      await page.waitForTimeout(120)

      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      assert(layout.scrollWidth <= layout.clientWidth + 2, `${viewport.name} ${view.path}: horizontal overflow ${layout.scrollWidth}px > ${layout.clientWidth}px`)
      assert(!(await page.locator('body').innerText()).includes('No fue posible'), `${viewport.name} ${view.path}: UI reported a load failure`)

      if (view.path === '/levantamientos') {
        const desktopVisible = await page.locator('.desktop-table').isVisible()
        const mobileVisible = await page.locator('.mobile-cards').isVisible()
        if (viewport.width > 900) assert(desktopVisible && !mobileVisible, `${viewport.name}: desktop table/card breakpoint is incorrect`)
        else assert(!desktopVisible && mobileVisible, `${viewport.name}: responsive cards are not active`)
      }
      if (view.path === '/usuarios/mock-user-1') {
        assert(await page.locator('button.save').isDisabled(), `${viewport.name}: Construction role save must remain disabled`)
      }

      await page.screenshot({ path: join(artifactsDir, `${viewport.name}-${view.slug}.png`), fullPage: true })
    }

    assert(consoleErrors.length === 0, `${viewport.name}: browser console errors: ${consoleErrors.join(' | ')}`)
    await page.close()
  }

  assert(forbiddenRequests.length === 0, `Production requests detected: ${forbiddenRequests.join(', ')}`)
  assert(unexpectedApiRequests.length === 0, `Unexpected API requests detected: ${unexpectedApiRequests.join(', ')}`)
  console.log(`Construction UI E2E PASS: ${viewports.length} viewports × ${views.length} views = ${viewports.length * views.length} responsive captures`)
  console.log('Production/API integrity PASS: no cifra.aquafim.com and no Construction HTTP requests')
} finally {
  await context.close()
  await browser.close()
}
