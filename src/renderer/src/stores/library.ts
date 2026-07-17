import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CollectionDto, VideoDto } from '@shared/types'

const SIDEBAR_COLLAPSED_KEY = 'instalib.sidebar.collapsed'

export const useLibraryStore = defineStore('library', () => {
  const videos = ref<VideoDto[]>([])
  const collections = ref<CollectionDto[]>([])
  const loading = ref(true)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')

  const totalVideoCount = computed(() => videos.value.length)
  const favoritesCount = computed(() => videos.value.filter((v) => v.favorite).length)

  let pendingRefresh: Promise<void> | null = null

  function refresh(): Promise<void> {
    if (pendingRefresh) return pendingRefresh
    loading.value = true
    error.value = null
    pendingRefresh = Promise.all([window.api.videosList({}), window.api.collectionsList()])
      .then(([v, c]) => {
        videos.value = v
        collections.value = c
        loaded.value = true
      })
      .catch((err) => {
        error.value = err instanceof Error ? err.message : String(err)
      })
      .finally(() => {
        loading.value = false
        pendingRefresh = null
      })
    return pendingRefresh
  }

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  }

  async function deleteCollection(id: string): Promise<void> {
    await window.api.collectionsDelete(id)
    await refresh()
  }

  return {
    videos,
    collections,
    loading,
    loaded,
    error,
    sidebarCollapsed,
    totalVideoCount,
    favoritesCount,
    refresh,
    toggleSidebar,
    deleteCollection
  }
})
