import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppSidebar from '@/components/AppSidebar.vue'
import { useLibraryStore } from '@/stores/library'

let router: Router

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'library', component: { template: '<div/>' } },
      { path: '/collection/:id', name: 'collection', component: { template: '<div/>' } }
    ]
  })
})

async function mountSidebar(path = '/') {
  await router.push(path)
  await router.isReady()
  return mount(AppSidebar, { global: { plugins: [router] } })
}

describe('AppSidebar', () => {
  it('calls library refresh on mount when not already loaded', async () => {
    vi.mocked(window.api.videosList).mockResolvedValue([])
    vi.mocked(window.api.collectionsList).mockResolvedValue([])
    await mountSidebar()
    expect(window.api.videosList).toHaveBeenCalled()
  })

  it('does not refetch when already loaded', async () => {
    const store = useLibraryStore()
    store.loaded = true
    await mountSidebar()
    expect(window.api.videosList).not.toHaveBeenCalled()
  })

  it('toggles sidebar collapse when the collapse button is clicked', async () => {
    const wrapper = await mountSidebar()
    const store = useLibraryStore()
    const before = store.sidebarCollapsed
    const toggleButton = wrapper.find('button')
    await toggleButton.trigger('click')
    expect(store.sidebarCollapsed).toBe(!before)
  })

  it('highlights the "All saved" link when on /collection/all', async () => {
    const wrapper = await mountSidebar('/collection/all')
    const links = wrapper.findAll('a')
    const allSavedLink = links.find((l) => l.text().includes('All saved'))!
    expect(allSavedLink.classes().join(' ')).toContain('text-primary')
  })

  it('shows collection names and video counts from the library store', async () => {
    const store = useLibraryStore()
    store.collections = [
      { id: 'c1', name: 'Trips', kind: 'imported', syncEnabled: true, videoCount: 5, coverVideoId: null, createdAt: 0 }
    ]
    const wrapper = await mountSidebar()
    expect(wrapper.text()).toContain('Trips')
    expect(wrapper.text()).toContain('5')
  })
})
