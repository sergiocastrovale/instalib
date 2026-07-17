import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import Search from '@/components/Search.vue'
import { router } from '@/router'
import { useSearchStore } from '@/stores/search'

beforeEach(() => {
  setActivePinia(createPinia())
})

function mountSearch() {
  return mount(Search, { global: { plugins: [router] } })
}

describe('Search (desktop)', () => {
  it('updates the store query live as you type', async () => {
    const wrapper = mountSearch()
    const store = useSearchStore()
    await wrapper.find('input').setValue('wombat')
    expect(store.query).toBe('wombat')
  })

  it('reflects the store query in the input value', async () => {
    const store = useSearchStore()
    store.setQuery('preset')
    const wrapper = mountSearch()
    await wrapper.vm.$nextTick()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('preset')
  })
})
