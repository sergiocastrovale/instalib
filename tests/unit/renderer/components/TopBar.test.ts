import { createPinia, setActivePinia } from 'pinia'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TopBar from '@/components/TopBar.vue'
import { useSearchStore } from '@/stores/search'
import { currentTheme } from '@/lib/theme'

beforeEach(() => {
  setActivePinia(createPinia())
  currentTheme.value = 'dark'
})

function mountTopBar() {
  return mount(TopBar, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('TopBar', () => {
  it('binds the search input to the search store query', async () => {
    const wrapper = mountTopBar()
    const store = useSearchStore()
    const input = wrapper.find('input')
    await input.setValue('wombat')
    expect(store.query).toBe('wombat')
  })

  it('reflects the store query in the input value', async () => {
    const store = useSearchStore()
    store.setQuery('preset')
    const wrapper = mountTopBar()
    await wrapper.vm.$nextTick()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('preset')
  })

  it('toggles the theme and persists it via window.api.settingsSet', async () => {
    const wrapper = mountTopBar()
    const toggleButton = wrapper.find('button[title="Toggle theme"]')
    await toggleButton.trigger('click')
    expect(currentTheme.value).toBe('light')
    expect(window.api.settingsSet).toHaveBeenCalledWith({ theme: 'light' })
  })

  it('opens the GitHub link via shellOpenExternal', async () => {
    const wrapper = mountTopBar()
    const githubButton = wrapper.find('button[title="GitHub"]')
    await githubButton.trigger('click')
    expect(window.api.shellOpenExternal).toHaveBeenCalledWith('https://github.com/sergiocastrovale')
  })
})
