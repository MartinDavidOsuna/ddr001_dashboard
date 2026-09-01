import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import AppLayout from '@/layouts/AppLayout.vue'
import dashboardRouter from '@/router'

const Empty = { template: '<div />' }

describe('Construction navigation', () => {
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
