import { strict as assert } from 'node:assert'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const appUrl = process.env.E2E_APP_URL || 'http://127.0.0.1:4174'
const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:3107/api/v1'
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD
const artifacts = process.env.E2E_ARTIFACTS_DIR || '.artifacts/construction-api'
assert(email && password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
assert(new URL(apiUrl).hostname === '127.0.0.1', 'The integrated E2E API must be local')
mkdirSync(artifacts, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const productionRequests = []
const apiRequests = []
const consoleErrors = []
let controlledFailure = false
let authorization = ''
let surveyPage
let usersPage

await context.route('**/*', async (route) => {
  const url = new URL(route.request().url())
  if (url.hostname === 'cifra.aquafim.com') {
    productionRequests.push(url.href)
    return route.abort()
  }
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    return route.fulfill({ status: 204, body: '' })
  }
  return route.continue()
})
page.on('console', (message) => { if (message.type() === 'error' && !controlledFailure) consoleErrors.push(message.text()) })
page.on('request', (request) => {
  if (!request.url().startsWith(apiUrl)) return
  const path = new URL(request.url()).pathname + new URL(request.url()).search
  apiRequests.push(`${request.method()} ${path}`)
  authorization ||= request.headers().authorization || ''
})
page.on('response', async (response) => {
  const url = new URL(response.url())
  if (response.status() !== 200 || !response.headers()['content-type']?.includes('json')) return
  try {
    if (url.pathname.endsWith('/admin/dashboard/construction/surveys')) surveyPage = await response.json()
    if (url.pathname.endsWith('/admin/dashboard/users')) usersPage = await response.json()
  } catch { /* binary and navigation responses are intentionally ignored */ }
})

async function visible(text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 20_000 })
}
async function noOverflow(label) {
  const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  assert(size.scroll <= size.client + 2, `${label}: horizontal overflow ${size.scroll} > ${size.client}`)
  assert(!page.url().includes('/login'), `${label}: unexpected login redirect`)
  assert(!(await page.locator('body').innerText()).includes('No fue posible'), `${label}: load failure shown`)
}

try {
  await page.goto(`${appUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const loginResponse = page.waitForResponse((r) => r.url() === `${apiUrl}/admin/auth/login`)
  await page.getByRole('button', { name: /Ingresar/ }).click()
  assert((await loginResponse).ok(), 'Real administrative login failed')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
  await visible('Dashboard')
  await visible('Construcci')
  await visible('Datos administrativos Construction')

  const initialSurveyResponse = page.waitForResponse((r) => r.url().includes('/admin/dashboard/construction/surveys?') && r.ok())
  await page.goto(`${appUrl}/levantamientos`, { waitUntil: 'domcontentloaded' })
  await visible('Listado de levantamientos')
  await visible('API_REAL')
  surveyPage = await (await initialSurveyResponse).json()
  assert(surveyPage?.items?.length, 'SQL TEST did not return a survey page')
  const survey = surveyPage.items.find((item) => Number(item.photoCount) > 0) || surveyPage.items[0]

  const searchResponse = page.waitForResponse((r) => r.url().includes('/construction/surveys?') && r.url().includes('search=') && r.ok())
  await page.locator('#construction-search').fill(survey.displayIdentifier)
  await searchResponse
  const statusResponse = page.waitForResponse((r) => r.url().includes(`/construction/surveys?`) && r.url().includes(`status=${survey.status}`) && r.ok())
  await page.locator('#construction-status').selectOption(survey.status)
  await statusResponse
  await page.locator('#construction-status').selectOption('all')
  await page.locator('#construction-search').fill('')

  await page.goto(`${appUrl}/levantamientos/${survey.surveyId}`, { waitUntil: 'domcontentloaded' })
  await visible('Avance de construcci')
  await visible('Evidencia fotogr')
  await visible('Correcciones')
  await visible('Ubicaci')
  await visible('Historial de estados')
  if (await page.locator('.construction-photo img').count()) {
    await page.locator('.construction-photo img').first().waitFor({ state: 'visible' })
    await page.locator('.construction-photo').first().click()
  }
  assert(authorization, 'No authenticated API request was observed')
  const mapResult = await page.evaluate(async ({ apiUrl, authorization }) => {
    const response = await fetch(`${apiUrl}/admin/dashboard/construction/map`, { headers: { Authorization: authorization } })
    return response.status
  }, { apiUrl, authorization })
  assert.equal(mapResult, 200, 'Construction map endpoint failed from the browser')

  const initialUsersResponse = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/admin/dashboard/users') && r.ok())
  await page.goto(`${appUrl}/usuarios`, { waitUntil: 'domcontentloaded' })
  await visible('Usuarios')
  usersPage = await (await initialUsersResponse).json()
  assert(usersPage?.items?.length, 'SQL TEST did not return dashboard users')
  const user = usersPage.items[0]
  await page.goto(`${appUrl}/usuarios/${user.userId}`, { waitUntil: 'domcontentloaded' })
  await visible('ACCESO A LEVANTAMIENTOS')
  await visible('API_AUTHORIZED')
  const roleSelect = page.locator('#construction-role-preview')
  const originalRole = await roleSelect.inputValue()
  const changedRole = originalRole === 'resident' ? 'contractor' : 'resident'
  const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/construction/users/${user.userId}/access`))
  await roleSelect.selectOption(changedRole)
  await page.getByRole('button', { name: /Guardar rol/ }).click()
  assert((await saved).ok(), 'Real access update failed')
  await visible('Acceso Construction guardado')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await visible('API_AUTHORIZED')
  assert.equal(await roleSelect.inputValue(), changedRole, 'Access update did not persist after refresh')

  const restored = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/construction/users/${user.userId}/access`))
  await roleSelect.selectOption(originalRole)
  await page.getByRole('button', { name: /Guardar rol/ }).click()
  assert((await restored).ok(), 'Original access role was not restored')
  await visible('Acceso Construction guardado')

  await page.route(`**/admin/dashboard/construction/users/${user.userId}/access`, async (route) => {
    if (route.request().method() === 'PUT') return route.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Controlled E2E failure' }) })
    return route.continue()
  }, { times: 1 })
  controlledFailure = true
  await roleSelect.selectOption(changedRole)
  await page.getByRole('button', { name: /Guardar rol/ }).click()
  await visible('El backend rechaz')
  controlledFailure = false
  assert.equal(await roleSelect.inputValue(), originalRole, 'Failed PUT left a false optimistic role')

  const refreshResponse = page.waitForResponse((r) => r.url() === `${apiUrl}/admin/auth/refresh` && r.ok())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await refreshResponse
  await visible('Detalle de usuario')

  const views = [
    ['/dashboard', 'Dashboard'],
    ['/levantamientos', 'Listado de levantamientos'],
    [`/levantamientos/${survey.surveyId}`, 'Avance de construcci'],
    ['/usuarios', 'Usuarios'],
    [`/usuarios/${user.userId}`, 'ACCESO A LEVANTAMIENTOS'],
  ]
  const viewports = [['desktop-1440', 1440, 1000], ['tablet-768', 768, 1024], ['mobile-390', 390, 844]]
  let captures = 0
  for (const [name, width, height] of viewports) {
    await page.setViewportSize({ width, height })
    for (const [path, expected] of views) {
      await page.goto(`${appUrl}${path}`, { waitUntil: 'domcontentloaded' })
      await visible(expected)
      await noOverflow(`${name} ${path}`)
      await page.screenshot({ path: join(artifacts, `${name}-${path.replaceAll('/', '_') || 'root'}.png`), fullPage: true })
      captures++
    }
  }

  assert.equal(productionRequests.length, 0, 'A production request was attempted')
  assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join(' | ')}`)
  for (const required of ['auth/login', 'auth/refresh', 'auth/me', 'construction/summary', 'construction/surveys', 'construction/metrics', 'construction/map', '/access', 'access-history']) {
    assert(apiRequests.some((request) => request.includes(required)), `Missing real API request: ${required}`)
  }
  console.log(`Construction real API E2E PASS: ${captures} captures; ${apiRequests.length} local API requests; 0 production requests`)
} finally {
  await context.close()
  await browser.close()
}
