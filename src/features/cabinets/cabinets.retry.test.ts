import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CabinetDashboardSection from './CabinetDashboardSection.vue';
import { cabinetsApi } from './cabinets.api';
import fixture from '../../../tests/fixtures/cabinets.json';
vi.mock('./cabinets.api', () => ({ cabinetsApi: { summary: vi.fn(), metrics: vi.fn() } }));
describe('Independent dashboard requests', () => {
  it.each(['summary', 'metrics'] as const)('retries only %s, preserving the other result', async (failed) => {
    vi.clearAllMocks();
    vi.mocked(cabinetsApi.summary).mockResolvedValue(fixture.summary);
    vi.mocked(cabinetsApi.metrics).mockResolvedValue(fixture.metrics);
    vi.mocked(cabinetsApi[failed]).mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: { title: 'Cabinet projection incomplete' } } });
    const w = mount(CabinetDashboardSection, { global: { stubs: { EChart: true, RouterLink: true } } });
    await flushPromises();
    const other = failed === 'summary' ? 'metrics' : 'summary';
    expect(w.text()).toContain(failed === 'summary' ? 'Avance por modelo' : 'Registro alcanzado');
    await w.get('[role="alert"] button').trigger('click'); await flushPromises();
    expect(cabinetsApi[failed]).toHaveBeenCalledTimes(2); expect(cabinetsApi[other]).toHaveBeenCalledTimes(1);
    expect(w.find('[role="alert"]').exists()).toBe(false); w.unmount();
  });
});
