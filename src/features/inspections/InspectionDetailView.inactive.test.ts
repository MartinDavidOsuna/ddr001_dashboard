import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ inspection: vi.fn(), photo: vi.fn() }))
vi.mock('@/services/dashboard', () => ({ dashboardService: mocks }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 'i' }, query: {} }), useRouter: () => ({ replace: vi.fn() }) }))
import Detail from './InspectionDetailView.vue'
describe('Inactive RV evidence', () => {
  it('shows absence evidence without requiring ordinary checklist or seven photo slots', async () => {
    mocks.inspection.mockResolvedValue({ inspectionId: 'i', inspectionType: 'RV', status: 'inactive', photos: [{ photoId: 'p', isMandatory: true, slotCode: 'ABSENCE', slotLabel: 'Evidencia de ausencia', thumbnailUrl: '/missing', contentUrl: '/missing' }], checklistItems: [], statusHistory: [], audit: [], inactiveClosure: { receivedAt: '2026-09-24T12:00:00Z', closure: { comment: 'No se encontró el hidrante', closedAt: '2026-09-24T12:00:00Z', photoIds: ['p'], location: { latitude: 22, longitude: -102 } } } })
    mocks.photo.mockRejectedValue(new Error('Missing in TEST'))
    const wrapper = mount(Detail, { global: { plugins: [createPinia()], stubs: { RouterLink: { template: '<a><slot /></a>' }, InspectionMap: true, InspectionWithdrawal: true } } })
    await flushPromises()
    expect(wrapper.text()).toContain('No se encontró el hidrante')
    expect(wrapper.findAll('.tabs button').map(b => b.text())).not.toContain('Checklist')
    const photos = wrapper.findAll('.tabs button').find(b => b.text() === 'Fotografías')!
    await photos.trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('Evidencia de ausencia (1)')
    expect(wrapper.findAll('.photo-card')).toHaveLength(1)
    expect(mocks.photo).toHaveBeenCalledWith('/missing')
    wrapper.unmount()
  })
})
