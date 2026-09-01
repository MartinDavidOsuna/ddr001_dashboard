import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConstructionListView from './ConstructionListView.vue'

const global = {
  stubs: {
    EChart: { template: '<div class="chart-stub" />' },
    RouterLink: { props: ['to'], template: '<a><slot /></a>' },
  },
}

describe('ConstructionListView', () => {
  it('renders Construction KPIs, filters and mock surveys', async () => {
    const wrapper = mount(ConstructionListView, { global })
    await flushPromises()
    expect(wrapper.text()).toContain('Levantamientos')
    expect(wrapper.text()).toContain('Vista preliminar')
    expect(wrapper.text()).toContain('Total de levantamientos')
    expect(wrapper.text()).toContain('BASE DEMO 01')
    expect(wrapper.find('#construction-search').exists()).toBe(true)
  })

  it('filters by search and functional status inside the survey list', async () => {
    const wrapper = mount(ConstructionListView, { global })
    await flushPromises()
    const list = wrapper.get('.list-card')

    await wrapper.find('#construction-search').setValue('BASE DEMO 04')
    expect(list.text()).toContain('1 de 8 registros')
    expect(list.text()).toContain('BASE DEMO 04')
    expect(list.text()).not.toContain('BASE DEMO 06')

    await wrapper.find('#construction-search').setValue('')
    await wrapper.find('#construction-status').setValue('delivered')
    expect(list.text()).toContain('1 de 8 registros')
    expect(list.text()).toContain('Entregado')
    expect(list.text()).toContain('BASE DEMO 06')
    expect(list.text()).not.toContain('BASE DEMO 04')
  })
})
