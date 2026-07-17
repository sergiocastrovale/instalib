import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CollectionDto, VideoDto } from '@shared/types'

const SIDEBAR_COLLAPSED_KEY = 'instalib.sidebar.collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export const useLibraryStore = defineStore('library', () => {
  const videos = ref<VideoDto[]>([])
  const collections = ref<CollectionDto[]>([])
  const loading = ref(true)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  const sidebarCollapsed = ref(readSidebarCollapsed())

  const totalVideoCount = computed(() => videos.value.length)
  const favoritesCount = computed(() => videos.value.filter((v) => v.favorite).length)

  function mostRecentCoverId(list: VideoDto[]): string | null {
    return (
      [...list]
        .filter((v) => v.thumbPath)
        .sort((a, b) => b.savedAt - a.savedAt)[0]?.id ?? null
    )
  }

  const allSavedCoverVideoId = computed(() => mostRecentCoverId(videos.value))
  const favoritesCoverVideoId = computed(() => mostRecentCoverId(videos.value.filter((v) => v.favorite)))

  const continueWatching = computed(() =>
    videos.value
      .filter((v) => v.positionSec > 5 && v.durationSec && v.positionSec / v.durationSec < 0.95)
      .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
      .slice(0, 10)
  )

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
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
    } catch {
      // sandboxed/private-browsing-like context - in-memory state still updates
    }
  }

  async function deleteCollection(id: string): Promise<void> {
    await window.api.collectionsDelete(id)
    await refresh()
  }

  function patchVideoLocal(id: string, patch: Partial<VideoDto>): void {
    const video = videos.value.find((v) => v.id === id)
    if (video) Object.assign(video, patch)
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
    allSavedCoverVideoId,
    favoritesCoverVideoId,
    continueWatching,
    refresh,
    toggleSidebar,
    deleteCollection,
    patchVideoLocal
  }
})
