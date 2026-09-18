import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InspectionWithdrawal from './InspectionWithdrawal.vue'
import { dashboardService } from '@/services/dashboard'

vi.mock('@/services/dashboard', () => ({ dashboardService: { withdrawInspection: vi.fn() } }))
const props = { inspectionId: 'rv-id', rowVersion: '0x0000000000000001', accountNumber: 'TEST-001', revisionNumber: 2 }
beforeEach(() => {
  vi.clearAllMocks()
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('RV withdrawal confirmation', () => {
  it('opens and submits over HTTP without crypto.randomUUID', async () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto)
    vi.stubGlobal('crypto', { getRandomValues })
    vi.mocked(dashboardService.withdrawInspection).mockResolvedValue({ inspectionId: 'rv-id', withdrawnAt: '2026-09-15', alreadyWithdrawn: false })
    const wrapper = mount(InspectionWithdrawal, { props })
    await wrapper.get('button').trigger('click')
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
    await wrapper.get('textarea').setValue('Registro duplicado')
    await wrapper.get('input[type=checkbox]').setValue(true)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(dashboardService.withdrawInspection).toHaveBeenCalledWith('rv-id', {
      reason: 'Registro duplicado', rowVersion: props.rowVersion,
      commandId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
    })
    expect(wrapper.emitted('withdrawn')).toHaveLength(1)
  })
  it('requires a reason and explicit confirmation before submitting', async () => {
    vi.mocked(dashboardService.withdrawInspection).mockResolvedValue({ inspectionId: 'rv-id', withdrawnAt: '2026-09-15', alreadyWithdrawn: false })
    const wrapper = mount(InspectionWithdrawal, { props })
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('TEST-001')
    await wrapper.get('form').trigger('submit')
    expect(dashboardService.withdrawInspection).not.toHaveBeenCalled()
    await wrapper.get('textarea').setValue(' Registro de ensayo ')
    await wrapper.get('input[type=checkbox]').setValue(true)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(dashboardService.withdrawInspection).toHaveBeenCalledWith('rv-id', expect.objectContaining({ reason: 'Registro de ensayo', rowVersion: props.rowVersion }))
    expect(wrapper.emitted('withdrawn')).toHaveLength(1)
  })
  it('keeps the same command identity on retry and does not report success after a failure', async () => {
    vi.mocked(dashboardService.withdrawInspection).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ inspectionId:'rv-id', withdrawnAt:'2026-09-15', alreadyWithdrawn:true })
    const wrapper = mount(InspectionWithdrawal, { props })
    await wrapper.get('button').trigger('click')
    await wrapper.get('textarea').setValue('Fixture')
    await wrapper.get('input[type=checkbox]').setValue(true)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(wrapper.emitted('withdrawn')).toBeUndefined()
    expect(wrapper.get('[role=alert]').text()).toContain('No se pudo confirmar')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    const calls = vi.mocked(dashboardService.withdrawInspection).mock.calls
    expect(calls[0]?.[1].commandId).toBe(calls[1]?.[1].commandId)
    expect(wrapper.emitted('withdrawn')).toHaveLength(1)
  })
})
