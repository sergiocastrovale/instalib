import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSearchStore } from '@/stores/search'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useSearchStore', () => {
  it('normalizedQuery trims and lowercases', () => {
    const store = useSearchStore()
    store.setQuery('  Hello World  ')
    expect(store.normalizedQuery).toBe('hello world')
  })

  it('hasQuery is false for empty/whitespace-only query', () => {
    const store = useSearchStore()
    expect(store.hasQuery).toBe(false)
    store.setQuery('   ')
    expect(store.hasQuery).toBe(false)
  })

  it('hasQuery is true once there is a non-whitespace query', () => {
    const store = useSearchStore()
    store.setQuery('x')
    expect(store.hasQuery).toBe(true)
  })

  it('clear() resets the query', () => {
    const store = useSearchStore()
    store.setQuery('something')
    store.clear()
    expect(store.query).toBe('')
    expect(store.hasQuery).toBe(false)
  })

  it('setCollectionFilter updates collectionFilter independently of query', () => {
    const store = useSearchStore()
    store.setCollectionFilter('col-1')
    expect(store.collectionFilter).toBe('col-1')
  })
})
