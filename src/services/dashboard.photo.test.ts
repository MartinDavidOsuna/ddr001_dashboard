import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { dashboardService } from './dashboard';
afterEach(() => vi.restoreAllMocks());
describe('Authenticated administrative photo destinations', () => {
  it.each([
    'https://example.invalid/admin/dashboard/photos/a/content',
    '//example.invalid/admin/dashboard/photos/a/content',
    '\\example.invalid/admin/dashboard/photos/a/content',
    '/admin/dashboard/inspections/../photos/a/content',
    '/admin/dashboard/photos/a/content?redirect=https://example.invalid',
    'data:image/jpeg;base64,anything',
  ])('rejects unsafe destination before HTTP: %s', async url => {
    const get = vi.spyOn(api, 'get');
    await expect(dashboardService.photo(url)).rejects.toThrow('Invalid administrative photo URL');
    expect(get).not.toHaveBeenCalled();
  });
  it.each([
    '/admin/dashboard/inspections/inspection-a/photos/photo-a/content',
    '/admin/dashboard/inspections/inspection-a/photos/photo-a/thumbnail',
    '/admin/dashboard/construction/surveys/survey-a/photos/photo-a/content',
    '/admin/dashboard/construction/surveys/survey-a/photos/photo-a/thumbnail',
    '/admin/dashboard/photos/photo-a/content',
  ])('preserves relative authenticated routes and object URLs: %s', async url => {
    const blob = new Blob(['image'], { type: 'image/jpeg' });
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: blob });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    expect(await dashboardService.photo(url)).toBe('blob:photo');
    expect(get).toHaveBeenCalledWith(url, { responseType: 'blob', timeout: 30_000 });
    expect(create).toHaveBeenCalledWith(blob);
  });
});
