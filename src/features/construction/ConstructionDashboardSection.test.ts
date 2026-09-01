import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConstructionDashboardSection from './ConstructionDashboardSection.vue'

describe('ConstructionDashboardSection', () => {
  it('renders Construction KPIs and the three priority charts separately from RV', () => {
    const wrapper = mount(ConstructionDashboardSection, {
      global: { stubs: { EChart: { template: '<div class="chart-stub" />' }, RouterLink: { props: ['to'], template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).toContain('LEVANTAMIENTOS / NUEVAS BASES')
    expect(wrapper.text()).toContain('Total de bases')
    expect(wrapper.text()).toContain('En construcción')
    expect(wrapper.text()).toContain('Pendientes de revisión')
    expect(wrapper.text()).toContain('Estado de levantamientos')
    expect(wrapper.text()).toContain('Bases por etapa actual')
    expect(wrapper.text()).toContain('Levantamientos creados / terminados')
    expect(wrapper.findAll('.chart-stub')).toHaveLength(3)
  })
})
