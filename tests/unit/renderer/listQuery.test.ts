import { describe, expect, it } from 'vitest'
import { listQuery } from '@/lib/listQuery'

describe('listQuery', () => {
  it('maps "all" to an empty query', () => {
    expect(listQuery('all')).toEqual({})
  })

  it('maps "favorites" to a favorites-only query', () => {
    expect(listQuery('favorites')).toEqual({ favorites: true })
  })

  it('maps any other id to a collectionId query', () => {
    expect(listQuery('some-collection-id')).toEqual({ collectionId: 'some-collection-id' })
  })
})
