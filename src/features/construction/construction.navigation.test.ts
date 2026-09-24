import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import AppLayout from '@/layouts/AppLayout.vue'
import dashboardRouter from '@/router'
import { useAuthStore } from '@/stores/auth'

const Empty = { template: '<div />' }

describe('Construction navigation', () => {
  it.each(['admin', 'supervisor', 'viewer'] as const)('shows the revision archive under Administration only for admin (%s)', async role => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: Empty }] })
    await router.push('/dashboard')
    const pinia = createPinia()
    const auth = useAuthStore(pinia)
    auth.user = { userId: 'test', role } as NonNullable<typeof auth.user>
    const wrapper = mount(AppLayout, { global: { plugins: [pinia, router], stubs: { RouterView: Empty } } })
    const administration = wrapper.get('section[aria-label="Administración"]')
    await administration.get('button').trigger('click')
    const archive = administration.find('a[href="/revisiones/archivo"]')
    expect(archive.exists()).toBe(role === 'admin')
    if (role === 'admin') expect(archive.text()).toBe('Archivo de bajas RV')
    wrapper.unmount()
  })
  it('registers list and detail routes', () => {
    const paths = dashboardRouter.getRoutes().map((route) => route.path)
    expect(paths).toContain('/levantamientos')
    expect(paths).toContain('/levantamientos/:surveyId')
  })

  it('shows Levantamientos in the primary menu with the correct link', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: Empty }] })
    await router.push('/dashboard')
    const wrapper = mount(AppLayout, { global: { plugins: [createPinia(), router], stubs: { RouterView: Empty } } })
    const link = wrapper.findAll('a').find((item) => item.text().includes('Levantamientos'))
    expect(link?.attributes('href')).toBe('/levantamientos')
  })
})
