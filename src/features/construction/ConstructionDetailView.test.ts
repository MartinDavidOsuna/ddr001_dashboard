import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRoute: () => ({ params: { surveyId: 'mock-survey-4' } }) }
})

import ConstructionDetailView from './ConstructionDetailView.vue'

describe('ConstructionDetailView', () => {
  it('shows construction timeline, evidence, correction and location sections', async () => {
    const wrapper = mount(ConstructionDetailView, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a><slot /></a>' },
          InspectionMap: { template: '<div class="map-stub">Mapa</div>' },
        },
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('EXPEDIENTE DE LEVANTAMIENTO')
    expect(wrapper.text()).toContain('Preparación del terreno')
    expect(wrapper.text()).toContain('Terminado')
    expect(wrapper.text()).toContain('Evidencia fotográfica por etapa')
    expect(wrapper.text()).toContain('Correcciones')
    expect(wrapper.text()).toContain('Ajustar acabado lateral')
    expect(wrapper.text()).toContain('Ubicación')
    expect(wrapper.text()).toContain('Historial de estados')
  })
})
