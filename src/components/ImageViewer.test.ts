import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ImageViewer from './ImageViewer.vue';
import { fitImage } from './image-viewer.geometry';
afterEach(() => vi.restoreAllMocks());
async function viewer() {
  const w = mount(ImageViewer, { props: { open: true, src: 'blob:a', photoKey: 'a', navigation: true }, slots: { default: '<input><b>Metadata</b>' } });
  await flushPromises();
  const stage = w.get('.viewer-stage');
  Object.defineProperties(stage.element, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
  vi.spyOn(stage.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
  Object.defineProperties(w.get('img').element, { naturalWidth: { value: 1440 }, naturalHeight: { value: 1920 } });
  await w.get('img').trigger('load');
  return w;
}
const zoom = (w: Awaited<ReturnType<typeof viewer>>) => Number(w.get('.viewer-stage').attributes('data-zoom'));
function key(value: string, code = '') { window.dispatchEvent(new KeyboardEvent('keydown', { key: value, code })); }
describe('Global image viewer', () => {
  it.each([[4000, 2000], [1440, 1920]])('fits large %s × %s without changing aspect ratio', (width, height) => {
    const fit = fitImage(width, height, 390, 550);
    expect(fit.width).toBeLessThanOrEqual(374.001); expect(fit.height).toBeLessThanOrEqual(534.001);
    expect(fit.width / fit.height).toBeCloseTo(width / height);
  });
  it('opens at fit and wheel up/down changes scale without scrolling', async () => {
    const w = await viewer(); expect(zoom(w)).toBe(1);
    await w.get('.viewer-stage').trigger('wheel', { deltaY: -100, clientX: 400, clientY: 300 }); expect(zoom(w)).toBeGreaterThan(1);
    await w.get('.viewer-stage').trigger('wheel', { deltaY: 100, clientX: 400, clientY: 300 }); expect(zoom(w)).toBe(1);
    w.unmount();
  });
  it('supports keyboard and numpad, bounds, reset, Escape and navigation', async () => {
    const w = await viewer(); key('+'); await flushPromises(); expect(zoom(w)).toBe(1.25);
    key('-'); await flushPromises(); expect(zoom(w)).toBe(1);
    key('', 'NumpadAdd'); await flushPromises(); expect(zoom(w)).toBe(1.25);
    key('', 'NumpadSubtract'); await flushPromises(); expect(zoom(w)).toBe(1);
    for (let i = 0; i < 40; i++) key('+'); await flushPromises(); expect(zoom(w)).toBe(5);
    await w.get('[aria-label="Ajustar a pantalla"]').trigger('click'); expect(zoom(w)).toBe(1);
    for (let i = 0; i < 40; i++) key('-'); await flushPromises(); expect(zoom(w)).toBe(1);
    key('ArrowLeft'); key('ArrowRight'); key('Escape');
    expect(w.emitted('previous')).toHaveLength(1); expect(w.emitted('next')).toHaveLength(1); expect(w.emitted('close')).toHaveLength(1);
    w.unmount();
  });
  it('pans only above fit and resets scale and pan on a different photo', async () => {
    const w = await viewer(), stage = w.get('.viewer-stage');
    await stage.trigger('pointerdown', { pointerId: 1, button: 0, clientX: 300, clientY: 300 });
    await stage.trigger('pointermove', { pointerId: 1, clientX: 300, clientY: 400 });
    expect(stage.attributes('data-pan-y')).toBe('0');
    key('+'); await flushPromises();
    await stage.trigger('pointermove', { pointerId: 1, clientX: 300, clientY: 430 });
    expect(Number(stage.attributes('data-pan-y'))).toBeGreaterThan(0);
    await w.setProps({ src: 'blob:b', photoKey: 'b' });
    expect(zoom(w)).toBe(1); expect(stage.attributes('data-pan-y')).toBe('0');
    expect(w.get('.viewer-metadata').attributes('style')).toBeUndefined(); w.unmount();
  });
  it('pinches around the center of two pointers and clears cancelled pointers', async () => {
    const w = await viewer(), stage = w.get('.viewer-stage');
    await stage.trigger('pointerdown', { pointerId: 1, button: 0, clientX: 300, clientY: 300 });
    await stage.trigger('pointerdown', { pointerId: 2, button: 0, clientX: 500, clientY: 300 });
    await stage.trigger('pointermove', { pointerId: 2, clientX: 600, clientY: 300 }); expect(zoom(w)).toBe(1.5);
    await stage.trigger('pointercancel', { pointerId: 1 }); await stage.trigger('pointerup', { pointerId: 2 });
    await stage.trigger('pointermove', { pointerId: 2, clientX: 700, clientY: 300 }); expect(zoom(w)).toBe(1.5); w.unmount();
  });
  it('ignores editable targets and removes listeners on close and unmount', async () => {
    const remove = vi.spyOn(window, 'removeEventListener'), w = await viewer();
    await w.get('input').trigger('keydown', { key: '+' }); expect(zoom(w)).toBe(1);
    await w.setProps({ open: false }); expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
    await w.setProps({ open: true }); w.unmount(); expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
  it('does not install listeners after immediate unmount during opening', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const w = mount(ImageViewer, { props: { open: true } });
    w.unmount(); await flushPromises();
    expect(add.mock.calls.filter(([event]) => event === 'keydown' || event === 'resize')).toHaveLength(0);
  });
});
