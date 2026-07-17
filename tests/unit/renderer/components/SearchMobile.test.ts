import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import SearchMobile from '@/components/SearchMobile.vue'
import { router } from '@/router'
import { useSearchStore } from '@/stores/search'

beforeEach(() => {
  setActivePinia(createPinia())
})

function mountSearchMobile() {
  return mount(SearchMobile, { global: { plugins: [router] } })
}

describe('SearchMobile (enter-only)', () => {
  it('does NOT touch the store while typing', async () => {
    const wrapper = mountSearchMobile()
    const store = useSearchStore()
    await wrapper.find('input').setValue('wombat')
    expect(store.query).toBe('')
  })

  it('commits to the store and emits close on Enter', async () => {
    const wrapper = mountSearchMobile()
    const store = useSearchStore()
    const input = wrapper.find('input')
    await input.setValue('wombat')
    await input.trigger('keyup.enter')
    expect(store.query).toBe('wombat')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('seeds the input from the existing store query', () => {
    const store = useSearchStore()
    store.setQuery('preset')
    const wrapper = mountSearchMobile()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('preset')
  })
})
