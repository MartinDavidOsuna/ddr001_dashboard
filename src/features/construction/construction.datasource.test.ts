import { afterEach, describe, expect, it, vi } from 'vitest'
import { constructionDataSource } from './construction.datasource'

describe('construction mock data source', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('navigates UI preview without Construction HTTP requests', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const items = await constructionDataSource.list()
    const detail = await constructionDataSource.getById(items[0]!.id)
    expect(items.length).toBeGreaterThan(0)
    expect(detail?.id).toBe(items[0]!.id)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns independent fixture copies', async () => {
    const first = await constructionDataSource.list()
    first[0]!.displayIdentifier = 'MUTATED'
    const second = await constructionDataSource.list()
    expect(second[0]!.displayIdentifier).not.toBe('MUTATED')
  })
})
