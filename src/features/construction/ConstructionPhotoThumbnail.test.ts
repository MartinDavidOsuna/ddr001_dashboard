import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const { photo } = vi.hoisted(() => ({ photo: vi.fn() }))
vi.mock('@/services/dashboard', () => ({ dashboardService: { photo } }))
import Thumbnail from './ConstructionPhotoThumbnail.vue'

beforeEach(() => {
  photo.mockReset()
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
describe('Protected construction evidence', () => {
  it('shows a recoverable original error independently from a loaded thumbnail', async () => {
    photo.mockResolvedValueOnce('blob:thumbnail').mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce('blob:original')
    const wrapper = mount(Thumbnail, { props: { thumbnailUrl: '/thumb', contentUrl: '/original' } })
    await flushPromises()
    await wrapper.get('.construction-photo').trigger('click')
    await flushPromises()
    expect(wrapper.get('.construction-photo img').attributes('src')).toBe('blob:thumbnail')
    expect(wrapper.get('[role="alert"]').text()).toContain('No fue posible cargar')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('dialog img').attributes('src')).toBe('blob:original')
    await wrapper.get('dialog > button').trigger('click')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:original')
    wrapper.unmount()
  })
  it('releases a late thumbnail when its component has been removed', async () => {
    let resolve!: (url: string) => void
    photo.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const wrapper = mount(Thumbnail, { props: { thumbnailUrl: '/thumb' } })
    wrapper.unmount()
    resolve('blob:late')
    await flushPromises()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:late')
  })
})
