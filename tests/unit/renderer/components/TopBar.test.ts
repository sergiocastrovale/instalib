import { createPinia, setActivePinia } from 'pinia'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import TopBar from '@/components/TopBar.vue'
import { currentTheme } from '@/lib/theme'

beforeEach(() => {
  setActivePinia(createPinia())
  currentTheme.value = 'dark'
})

function mountTopBar() {
  // Search/SidebarMobile pull in useRoute()/router and have their own tests;
  // stub them here so TopBar tests stay focused on the top-bar actions.
  return mount(TopBar, {
    global: { stubs: { RouterLink: RouterLinkStub, Search: true, SidebarMobile: true } }
  })
}

describe('TopBar', () => {
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
    expect(window.api.shellOpenExternal).toHaveBeenCalledWith('https://github.com/sergiocastrovale/instalib')
  })
})
