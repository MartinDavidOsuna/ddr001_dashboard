import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/dashboard', () => ({
  dashboardService: {
    filters: vi.fn().mockResolvedValue({ crews: [] }),
    users: vi.fn().mockResolvedValue({
      page: 1,
      pageSize: 25,
      total: 1,
      items: [{
        userId: 'mock-user-1', fullName: 'Usuario Demo', email: 'demo@example.invalid', phone: '', employeeNumber: 'DEMO-01', isActive: true,
        crewId: 'rv-crew-demo', crewName: 'Cuadrilla RV Demo', inspectionCount: 3, submittedCount: 3, validatedCount: 2, rejectedCount: 1,
        sessionCount: 2, activeSessionCount: 0, deviceCount: 1, createdAt: '2026-08-01T10:00:00-06:00', updatedAt: '2026-08-30T10:00:00-06:00', lastActivityAt: '2026-08-30T10:00:00-06:00',
      }],
    }),
  },
}))

import UserListView from './UserListView.vue'

describe('UserListView Construction preview', () => {
  it('keeps RV crew data and adds Empresa plus Rol Levantamientos', async () => {
    const wrapper = mount(UserListView, { global: { stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } } } })
    await flushPromises()
    expect(wrapper.text()).toContain('Cuadrilla RV Demo')
    expect(wrapper.text()).toContain('Empresa')
    expect(wrapper.text()).toContain('Rol Levantamientos')
    expect(wrapper.text()).toContain('Contratista')
  })
})
