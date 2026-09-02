import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import ConstructionUserAccessCard from './ConstructionUserAccessCard.vue'

describe('ConstructionUserAccessCard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows role preview and never enables persistence', async () => {
    const auth = useAuthStore()
    auth.user = { kind: 'admin', userId: 'admin-demo', role: 'admin', tokenId: 'token-demo' }
    const wrapper = mount(ConstructionUserAccessCard, { props: { userId: 'mock-user-1' } })
    expect(wrapper.text()).toContain('ACCESO A LEVANTAMIENTOS')
    expect(wrapper.text()).toContain('Contratista')
    await wrapper.find('#construction-role-preview').setValue('resident')
    expect(wrapper.text()).toContain('Puede consultar todos los levantamientos')
    expect(wrapper.get('button.save').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('No se ejecuta POST, PATCH ni PUT')
  })

  it('locks role preview for viewer sessions', () => {
    const auth = useAuthStore()
    auth.user = { kind: 'admin', userId: 'viewer-demo', role: 'viewer', tokenId: 'token-demo' }
    const wrapper = mount(ConstructionUserAccessCard, { props: { userId: 'mock-user-2' } })
    expect(wrapper.get('#construction-role-preview').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('solo lectura')
  })
})
