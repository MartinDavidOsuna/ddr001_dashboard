import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'

const mock = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), summary: vi.fn(), metrics: vi.fn(), access: vi.fn(), history: vi.fn(), save: vi.fn() }))
vi.mock('./construction.datasource', () => ({ CONSTRUCTION_DATA_MODE: 'API_REAL', constructionDataSource: { listPage: mock.list, getById: mock.detail } }))
vi.mock('./construction.analytics.service', () => ({ getConstructionSummary: mock.summary, getConstructionMetrics: mock.metrics }))
vi.mock('./construction.access.service', () => ({ getConstructionAccess: mock.access, getConstructionAccessHistory: mock.history, updateConstructionAccess: mock.save }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { surveyId: 's1' } }), RouterLink: { template: '<a><slot /></a>' } }))
import List from './ConstructionListView.vue'
import Detail from './ConstructionDetailView.vue'
import Dashboard from './ConstructionDashboardSection.vue'
import Access from './ConstructionUserAccessCard.vue'

const global = { stubs: { EChart: true, RouterLink: { template: '<a><slot /></a>' }, InspectionMap: true } }
const survey = { id: 's1', displayIdentifier: 'BASE REAL', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', status: 'created', currentStep: 0, contractorName: 'Contratista real', syncState: 'unknown', photoCount: 12, photos: [], steps: [], corrections: [], history: [], alerts: [] }
const page = { items: [survey], total: 218, page: 1, pageSize: 25, totalPages: 9 }
const summary = { total: 218, created: 127, inProgress: 63, executed: 2, rejected: 0, accepted: 2, delivered: 24, pendingReview: 2, finished: 28, completionPercent: 12.8, photoCount: 422, confirmedEvidenceCount: 422 }
const metrics = { status: [], stages: [], temporal: [], contractors: [], companies: [], rejection: { rejectionRate: 0, averageCreatedToExecutedDays: null } }
beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  mock.list.mockResolvedValue(page)
  mock.summary.mockResolvedValue(summary)
  mock.metrics.mockResolvedValue(metrics)
  mock.history.mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

describe('Construction real data UI', () => {
  it('uses server photo counts and does not assert mobile synchronization', async () => {
    const wrapper = mount(List, { global })
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('12')
    expect(wrapper.get('tbody').text()).toContain('No informada')
    expect(wrapper.get('.list-head').text()).toContain('1 de 218 registros')
    expect(wrapper.get('a[to="/dashboard#estadisticas-levantamientos"]').text()).toContain('Estadísticas')
    expect(wrapper.text()).not.toContain('Registros mock')
    wrapper.unmount()
  })
  it('keeps metric failure visible without falling back to page totals and retries', async () => {
    mock.summary.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mount(Dashboard, { global })
    await flushPromises()
    expect(wrapper.find('.construction-kpis').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('No fue posible cargar')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('.construction-kpis').text()).toContain('190')
    expect(wrapper.get('.secondary-metrics').text()).toContain('422')
    expect(wrapper.get('.secondary-metrics').text()).toContain('— días')
    expect(mock.list).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('ignores old responses after filters change and sends an exclusive local date boundary', async () => {
    vi.useFakeTimers()
    let resolveOld!: (value: typeof page) => void
    mock.list.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const wrapper = mount(List, { global })
    await wrapper.get('#construction-search').setValue('new')
    await wrapper.get('#construction-to').setValue('2026-09-22')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(mock.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'new', to: new Date('2026-09-23T00:00:00').toISOString() }))
    resolveOld({ ...page, items: [{ ...survey, displayIdentifier: 'STALE' }] })
    await flushPromises()
    expect(wrapper.text()).not.toContain('STALE')
    wrapper.unmount()
  })
  it('recovers a failed detail request instead of leaving the spinner active', async () => {
    mock.detail.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(survey)
    const wrapper = mount(Detail, { global })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Cargando expediente')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('BASE REAL')
    expect(wrapper.text()).not.toContain('fixtures locales')
    wrapper.unmount()
  })
  it('does not show zeros when dashboard metrics fail', async () => {
    mock.metrics.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mount(Dashboard, { global })
    await flushPromises()
    expect(wrapper.find('.construction-kpis').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    wrapper.unmount()
  })
  it('does not display simulated access after a failed API request', async () => {
    mock.access.mockRejectedValueOnce(new Error('forbidden'))
    const wrapper = mount(Access, { props: { userId: 'u1' } })
    await flushPromises()
    expect(wrapper.find('.access-summary').exists()).toBe(false)
    expect(wrapper.find('button.save').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    wrapper.unmount()
  })
  it('only offers assignable roles and distinguishes a successful write from failed refresh', async () => {
    useAuthStore().user = { kind: 'admin', userId: 'a1', role: 'admin', tokenId: 't1' }
    mock.access.mockResolvedValueOnce({ userId: 'u1', role: 'contractor', accessEnabled: true, ownSurveyCount: 1 })
    const wrapper = mount(Access, { props: { userId: 'u1' } })
    await flushPromises()
    expect(wrapper.find('option[value="admin"]').exists()).toBe(false)
    await wrapper.get('select').setValue('resident')
    mock.save.mockResolvedValueOnce(undefined)
    mock.access.mockRejectedValueOnce(new Error('offline'))
    await wrapper.get('button.save').trigger('click')
    await flushPromises()
    expect(mock.save).toHaveBeenCalledWith('u1', 'resident')
    expect(wrapper.text()).toContain('El cambio fue guardado')
    wrapper.unmount()
  })
})
