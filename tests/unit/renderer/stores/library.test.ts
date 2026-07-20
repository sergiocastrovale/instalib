import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLibraryStore } from '@/stores/library'
import type { VideoDto } from '@shared/types'

function makeVideo(overrides: Partial<VideoDto> = {}): VideoDto {
  return {
    id: overrides.id ?? Math.random().toString(36),
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: 'author',
    caption: 'caption',
    savedAt: Date.now(),
    durationSec: 100,
    filePath: null,
    thumbPath: null,
    status: 'downloaded',
    error: null,
    positionSec: 0,
    speed: 1,
    watched: false,
    favorite: false,
    notes: '',
    sections: [],
    lastPlayedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useLibraryStore', () => {
  describe('continueWatching', () => {
    it('includes videos with positionSec > 5 and progress < 95%, excludes the rest', async () => {
      const inProgress = makeVideo({ id: 'a', positionSec: 30, durationSec: 100, lastPlayedAt: 10 })
      const barelyStarted = makeVideo({ id: 'b', positionSec: 3, durationSec: 100, lastPlayedAt: 20 })
      const almostDone = makeVideo({ id: 'c', positionSec: 96, durationSec: 100, lastPlayedAt: 30 })
      const noDuration = makeVideo({ id: 'd', positionSec: 30, durationSec: null, lastPlayedAt: 40 })

      vi.mocked(window.api.videosList).mockResolvedValue([inProgress, barelyStarted, almostDone, noDuration])
      vi.mocked(window.api.collectionsList).mockResolvedValue([])

      const store = useLibraryStore()
      await store.refresh()

      expect(store.continueWatching.map((v) => v.id)).toEqual(['a'])
    })

    it('sorts by lastPlayedAt desc and caps at 10', async () => {
      const videos = Array.from({ length: 12 }, (_, i) =>
        makeVideo({ id: `v${i}`, positionSec: 30, durationSec: 100, lastPlayedAt: i })
      )
      vi.mocked(window.api.videosList).mockResolvedValue(videos)
      vi.mocked(window.api.collectionsList).mockResolvedValue([])

      const store = useLibraryStore()
      await store.refresh()

      expect(store.continueWatching).toHaveLength(10)
      expect(store.continueWatching[0]!.id).toBe('v11')
      expect(store.continueWatching[9]!.id).toBe('v2')
    })
  })

  it('favoritesCount counts only favorited videos', async () => {
    vi.mocked(window.api.videosList).mockResolvedValue([
      makeVideo({ id: 'a', favorite: true }),
      makeVideo({ id: 'b', favorite: false }),
      makeVideo({ id: 'c', favorite: true })
    ])
    vi.mocked(window.api.collectionsList).mockResolvedValue([])

    const store = useLibraryStore()
    await store.refresh()

    expect(store.favoritesCount).toBe(2)
  })

  describe('cover getters', () => {
    it('allSavedCoverVideoId picks the most recently saved thumbed video across all videos', async () => {
      vi.mocked(window.api.videosList).mockResolvedValue([
        makeVideo({ id: 'old', thumbPath: '/x.jpg', savedAt: 1000 }),
        makeVideo({ id: 'new', thumbPath: '/y.jpg', savedAt: 2000 }),
        makeVideo({ id: 'no-thumb', thumbPath: null, savedAt: 3000 })
      ])
      vi.mocked(window.api.collectionsList).mockResolvedValue([])

      const store = useLibraryStore()
      await store.refresh()

      expect(store.allSavedCoverVideoId).toBe('new')
    })

    it('favoritesCoverVideoId only considers favorited videos', async () => {
      vi.mocked(window.api.videosList).mockResolvedValue([
        makeVideo({ id: 'fav-old', favorite: true, thumbPath: '/x.jpg', savedAt: 1000 }),
        makeVideo({ id: 'nonfav-new', favorite: false, thumbPath: '/y.jpg', savedAt: 2000 })
      ])
      vi.mocked(window.api.collectionsList).mockResolvedValue([])

      const store = useLibraryStore()
      await store.refresh()

      expect(store.favoritesCoverVideoId).toBe('fav-old')
    })
  })

  describe('refresh', () => {
    it('dedupes concurrent calls into a single videosList request', async () => {
      let resolveList: (v: VideoDto[]) => void
      vi.mocked(window.api.videosList).mockReturnValue(
        new Promise((resolve) => {
          resolveList = resolve
        })
      )
      vi.mocked(window.api.collectionsList).mockResolvedValue([])

      const store = useLibraryStore()
      const p1 = store.refresh()
      const p2 = store.refresh()

      resolveList!([])
      await Promise.all([p1, p2])
      // Pinia wraps each action call's returned promise for devtools, so p1 and
      // p2 are different wrapper objects even when deduped - the real signal is
      // that videosList was only actually invoked once.
      expect(window.api.videosList).toHaveBeenCalledTimes(1)
    })

    it('sets error on failure and clears loading', async () => {
      vi.mocked(window.api.videosList).mockRejectedValue(new Error('boom'))
      vi.mocked(window.api.collectionsList).mockResolvedValue([])

      const store = useLibraryStore()
      await store.refresh()

      expect(store.error).toBe('boom')
      expect(store.loading).toBe(false)
    })
  })

  describe('toggleSidebar', () => {
    it('persists to localStorage and flips state', () => {
      const store = useLibraryStore()
      const initial = store.sidebarCollapsed
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(!initial)
      expect(localStorage.getItem('instalib.sidebar.collapsed')).toBe(!initial ? '1' : '0')
    })

    it('guards localStorage.setItem with try/catch (still updates in-memory state)', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage disabled')
      })
      const store = useLibraryStore()
      const initial = store.sidebarCollapsed
      expect(() => store.toggleSidebar()).not.toThrow()
      expect(store.sidebarCollapsed).toBe(!initial)
    })

    it('guards localStorage.getItem on init (defaults to false when it throws)', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled')
      })
      const store = useLibraryStore()
      expect(store.sidebarCollapsed).toBe(false)
    })
  })

  it('patchVideoLocal merges a partial patch into the in-memory video', async () => {
    vi.mocked(window.api.videosList).mockResolvedValue([makeVideo({ id: 'a', favorite: false })])
    vi.mocked(window.api.collectionsList).mockResolvedValue([])

    const store = useLibraryStore()
    await store.refresh()

    store.patchVideoLocal('a', { favorite: true, notes: 'hi' })

    const video = store.videos.find((v) => v.id === 'a')!
    expect(video.favorite).toBe(true)
    expect(video.notes).toBe('hi')
  })
})
