import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const { access } = vi.hoisted(() => ({ access: vi.fn() }))
vi.mock('@/features/construction/construction.datasource', () => ({ CONSTRUCTION_DATA_MODE: 'API_REAL' }))
vi.mock('@/features/construction/construction.access.service', () => ({ getConstructionAccess: access }))
vi.mock('@/services/dashboard', () => ({ dashboardService: {
  filters: vi.fn(async () => ({ crews: [] })),
  users: vi.fn(async () => ({ page: 1, pageSize: 25, total: 1, items: [{ userId: 'u1', fullName: 'Usuario real', isActive: true, crewName: 'Cuadrilla RV', inspectionCount: 0, activeSessionCount: 0 }] })),
} }))
import Users from './UserListView.vue'
const global = { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
beforeEach(() => { access.mockReset() })
describe('Real construction access in user directory', () => {
  it('reads company and role from the access endpoint', async () => {
    access.mockResolvedValue({ userId: 'u1', role: 'resident', companyName: 'Empresa real', accessEnabled: true })
    const wrapper = mount(Users, { global })
    await flushPromises()
    expect(wrapper.text()).toContain('Empresa real')
    expect(wrapper.text()).toContain('Residente')
    expect(access).toHaveBeenCalledWith('u1')
    wrapper.unmount()
  })
  it('shows unavailable rather than a demo role when access fails', async () => {
    access.mockRejectedValue(new Error('forbidden'))
    const wrapper = mount(Users, { global })
    await flushPromises()
    expect(wrapper.text()).toContain('No disponible')
    expect(wrapper.text()).not.toContain('Contratista')
    wrapper.unmount()
  })
})
