import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearch } from '@/composables/useSearch'
import { router } from '@/router'
import { useSearchStore } from '@/stores/search'

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mountWithSearch() {
  let api!: ReturnType<typeof useSearch>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useSearch()
        return () => h('div')
      }
    }),
    { global: { plugins: [router] } }
  )
  return { wrapper, api }
}

describe('useSearch', () => {
  it('submit(value) writes the value to the store', () => {
    const { api } = mountWithSearch()
    const store = useSearchStore()
    api.submit('wombat')
    expect(store.query).toBe('wombat')
  })

  it('submit navigates to the library when off it with a non-empty query', async () => {
    await router.push('/settings')
    const pushSpy = vi.spyOn(router, 'push')
    const { api } = mountWithSearch()
    api.submit('wombat')
    expect(pushSpy).toHaveBeenCalledWith('/')
  })

  it('submit does not navigate for an empty/whitespace query', async () => {
    await router.push('/settings')
    const pushSpy = vi.spyOn(router, 'push')
    const { api } = mountWithSearch()
    api.submit('   ')
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('query is a writable proxy for the store query', () => {
    const { api } = mountWithSearch()
    const store = useSearchStore()
    api.query.value = 'typed'
    expect(store.query).toBe('typed')
  })
})
