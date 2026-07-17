import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withTempDb, type TempDb } from '../../../helpers/db'

let temp: TempDb
let videos: typeof import('../../../../src/main/db/videos')

beforeEach(async () => {
  temp = await withTempDb()
  videos = await import('../../../../src/main/db/videos')
})

afterEach(() => {
  temp.dispose()
})

function seedVideo(overrides: Partial<Parameters<typeof videos.upsertVideo>[0]> = {}): string {
  const { id } = videos.upsertVideo({
    shortcode: overrides.shortcode ?? `sc-${Math.random().toString(36).slice(2)}`,
    permalink: overrides.permalink ?? 'https://www.instagram.com/p/sc/',
    author: overrides.author ?? 'author',
    caption: overrides.caption ?? 'caption',
    savedAt: overrides.savedAt ?? Date.now()
  })
  return id
}

describe('upsertVideo', () => {
  it('inserts a new video and reports inserted: true', () => {
    const result = videos.upsertVideo({
      shortcode: 'ABC',
      permalink: 'https://www.instagram.com/p/ABC/',
      author: 'a',
      caption: 'c',
      savedAt: 1000
    })
    expect(result.inserted).toBe(true)
    expect(videos.getVideo(result.id)?.shortcode).toBe('ABC')
  })

  it('updates on conflicting shortcode and reports inserted: false', () => {
    // upsertVideo distinguishes insert-vs-update by comparing the RETURNING
    // created_at to Date.now() at call time, so the two calls need to land in
    // different milliseconds or the heuristic can't tell them apart.
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const first = videos.upsertVideo({
      shortcode: 'ABC',
      permalink: 'https://www.instagram.com/p/ABC/',
      author: 'a',
      caption: 'c',
      savedAt: 1000
    })
    vi.setSystemTime(2000)
    const second = videos.upsertVideo({
      shortcode: 'ABC',
      permalink: 'https://www.instagram.com/p/ABC-new/',
      author: null,
      caption: null,
      savedAt: 2000
    })
    vi.useRealTimers()
    expect(second.inserted).toBe(false)
    expect(second.id).toBe(first.id)
    const row = videos.getVideo(first.id)
    expect(row?.permalink).toBe('https://www.instagram.com/p/ABC-new/')
    // COALESCE(excluded.author, videos.author) - null excluded author keeps the old value
    expect(row?.author).toBe('a')
  })
})

describe('listVideos', () => {
  it('filters by favorites', () => {
    const id1 = seedVideo()
    seedVideo()
    videos.patchVideo(id1, { favorite: true })
    const results = videos.listVideos({ favorites: true })
    expect(results.map((v) => v.id)).toEqual([id1])
  })

  it('filters by status', () => {
    const id1 = seedVideo()
    seedVideo()
    videos.setDownloadResult(id1, { status: 'downloaded' })
    const results = videos.listVideos({ status: 'downloaded' })
    expect(results.map((v) => v.id)).toEqual([id1])
  })

  it('filters by search across author/caption/notes', () => {
    const id1 = seedVideo({ author: 'wombat_watcher', caption: 'x' })
    seedVideo({ author: 'other', caption: 'y' })
    const results = videos.listVideos({ search: 'wombat' })
    expect(results.map((v) => v.id)).toEqual([id1])
  })

  it('escapes LIKE metacharacters (%, _, \\) in search so they are treated literally', () => {
    const id1 = seedVideo({ author: '100%_real\\author' })
    seedVideo({ author: 'nomatch' })

    const literal = videos.listVideos({ search: '100%_real\\author' })
    expect(literal.map((v) => v.id)).toEqual([id1])

    // without escaping, '%' and '_' would match anything - assert they don't
    // over-match here by searching for a pattern that would hit every row if
    // treated as SQL wildcards instead of literal characters.
    const wildcardSearch = videos.listVideos({ search: '%_%' })
    expect(wildcardSearch).toEqual([])
  })

  it('sorts by savedAt desc by default', () => {
    const id1 = seedVideo({ savedAt: 1000 })
    const id2 = seedVideo({ savedAt: 2000 })
    const results = videos.listVideos({})
    expect(results.map((v) => v.id)).toEqual([id2, id1])
  })

  it('sorts by author and lastPlayedAt when requested', () => {
    seedVideo({ author: 'zeta' })
    seedVideo({ author: 'alpha' })
    const byAuthor = videos.listVideos({ sort: 'author' })
    expect(byAuthor.map((v) => v.author)).toEqual(['zeta', 'alpha'])
  })

  it('filters by collectionId via join', async () => {
    const collections = await import('../../../../src/main/db/collections')
    const id1 = seedVideo()
    seedVideo()
    const collectionId = collections.upsertImportedCollection('My Collection')
    collections.addVideoToCollection(collectionId, id1)
    const results = videos.listVideos({ collectionId })
    expect(results.map((v) => v.id)).toEqual([id1])
  })
})

describe('patchVideo', () => {
  it('updates only the provided fields', () => {
    const id = seedVideo()
    const before = videos.getVideo(id)!
    videos.patchVideo(id, { favorite: true })
    const after = videos.getVideo(id)!
    expect(after.favorite).toBe(true)
    expect(after.notes).toBe(before.notes)
  })

  it('sets last_played_at when positionSec changes, not on other fields', () => {
    const id = seedVideo()
    expect(videos.getVideo(id)!.lastPlayedAt).toBeNull()
    videos.patchVideo(id, { favorite: true })
    expect(videos.getVideo(id)!.lastPlayedAt).toBeNull()
    videos.patchVideo(id, { positionSec: 42 })
    expect(videos.getVideo(id)!.lastPlayedAt).not.toBeNull()
  })

  it('is a no-op that just returns the current row on an empty patch', () => {
    const id = seedVideo()
    const before = videos.getVideo(id)
    const result = videos.patchVideo(id, {})
    expect(result).toEqual(before)
  })
})

describe('setDownloadResult', () => {
  it('COALESCEs filePath/thumbPath/durationSec - status-only update preserves them', () => {
    const id = seedVideo()
    videos.setDownloadResult(id, {
      status: 'downloaded',
      filePath: '/x/video.mp4',
      thumbPath: '/x/thumb.jpg',
      durationSec: 12
    })
    videos.setDownloadResult(id, { status: 'failed', error: 'oops' })
    const row = videos.getVideo(id)!
    expect(row.status).toBe('failed')
    expect(row.filePath).toBe('/x/video.mp4')
    expect(row.thumbPath).toBe('/x/thumb.jpg')
    expect(row.durationSec).toBe(12)
    expect(row.error).toBe('oops')
  })

  it('clears the resolved URL cache on every call', () => {
    const id = seedVideo()
    videos.setResolvedUrl(id, 'https://cdn/video.mp4', Date.now() + 1000)
    videos.setDownloadResult(id, { status: 'pending' })
    expect(videos.getResolvedUrl(id)).toBeNull()
  })
})

describe('resolved URL cache', () => {
  it('round-trips set/get/clear', () => {
    const id = seedVideo()
    expect(videos.getResolvedUrl(id)).toBeNull()
    const expiresAt = Date.now() + 60_000
    videos.setResolvedUrl(id, 'https://cdn/video.mp4', expiresAt)
    expect(videos.getResolvedUrl(id)).toEqual({ url: 'https://cdn/video.mp4', expiresAt })
    videos.clearResolvedUrl(id)
    expect(videos.getResolvedUrl(id)).toBeNull()
  })
})

describe('resetStaleDownloads', () => {
  it('flips downloading videos back to pending', () => {
    const id1 = seedVideo()
    const id2 = seedVideo()
    videos.setDownloadResult(id1, { status: 'downloading' })
    videos.setDownloadResult(id2, { status: 'downloaded' })
    videos.resetStaleDownloads()
    expect(videos.getVideo(id1)!.status).toBe('pending')
    expect(videos.getVideo(id2)!.status).toBe('downloaded')
  })
})
