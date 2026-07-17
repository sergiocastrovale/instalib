import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { withTempDb, type TempDb } from '../../../helpers/db'

let temp: TempDb
let collections: typeof import('../../../../src/main/db/collections')
let videos: typeof import('../../../../src/main/db/videos')

beforeEach(async () => {
  temp = await withTempDb()
  collections = await import('../../../../src/main/db/collections')
  videos = await import('../../../../src/main/db/videos')
})

afterEach(() => {
  temp.dispose()
})

function seedVideo(overrides: Partial<Parameters<typeof videos.upsertVideo>[0]> = {}): string {
  const { id } = videos.upsertVideo({
    shortcode: overrides.shortcode ?? `sc-${Math.random().toString(36).slice(2)}`,
    permalink: 'https://www.instagram.com/p/sc/',
    author: 'author',
    caption: 'caption',
    savedAt: overrides.savedAt ?? Date.now()
  })
  return id
}

function idsMatchingScope(scope: string, collectionId?: string): string[] {
  const rows = temp.db
    .getDb()
    .prepare(`SELECT v.id FROM videos v WHERE ${scope} ORDER BY v.id`)
    .all({ collectionId }) as { id: string }[]
  return rows.map((r) => r.id).sort()
}

describe('upsertImportedCollection', () => {
  it('creates a new collection', () => {
    const id = collections.upsertImportedCollection('Trips')
    expect(collections.listCollections().find((c) => c.id === id)?.name).toBe('Trips')
  })

  it('dedupes by name+kind, returning the existing id', () => {
    const id1 = collections.upsertImportedCollection('Trips')
    const id2 = collections.upsertImportedCollection('Trips')
    expect(id2).toBe(id1)
    expect(collections.listCollections().filter((c) => c.name === 'Trips')).toHaveLength(1)
  })
})

describe('addVideoToCollection', () => {
  it('is idempotent (INSERT OR IGNORE) - adding twice does not duplicate or throw', () => {
    const collectionId = collections.upsertImportedCollection('Trips')
    const videoId = seedVideo()
    collections.addVideoToCollection(collectionId, videoId)
    expect(() => collections.addVideoToCollection(collectionId, videoId)).not.toThrow()
    const list = collections.listCollections()
    expect(list.find((c) => c.id === collectionId)?.videoCount).toBe(1)
  })
})

describe('listCollections', () => {
  it('reports video_count and picks the most recently saved thumbed video as cover', () => {
    const collectionId = collections.upsertImportedCollection('Trips')
    const older = seedVideo({ savedAt: 1000 })
    const newer = seedVideo({ savedAt: 2000 })
    collections.addVideoToCollection(collectionId, older)
    collections.addVideoToCollection(collectionId, newer)
    videos.setDownloadResult(older, { status: 'downloaded', thumbPath: '/x/older.jpg' })
    videos.setDownloadResult(newer, { status: 'downloaded', thumbPath: '/x/newer.jpg' })

    const dto = collections.listCollections().find((c) => c.id === collectionId)!
    expect(dto.videoCount).toBe(2)
    expect(dto.coverVideoId).toBe(newer)
  })

  it('orders kind DESC (user before imported) then name case-insensitively', () => {
    collections.upsertImportedCollection('zeta')
    collections.upsertImportedCollection('Alpha')
    const names = collections.listCollections().map((c) => c.name)
    expect(names).toEqual(['Alpha', 'zeta'])
  })
})

describe('deleteCollectionAndOrphanVideos', () => {
  it('deletes videos that are non-favorite and only in this collection (orphans)', () => {
    const collectionId = collections.upsertImportedCollection('Trips')
    const orphan = seedVideo()
    collections.addVideoToCollection(collectionId, orphan)

    const deleted = collections.deleteCollectionAndOrphanVideos(collectionId)

    expect(deleted.map((o) => o.id)).toEqual([orphan])
    expect(videos.getVideo(orphan)).toBeNull()
  })

  it('keeps favorited videos even if they would otherwise be orphaned', () => {
    const collectionId = collections.upsertImportedCollection('Trips')
    const favorite = seedVideo()
    videos.patchVideo(favorite, { favorite: true })
    collections.addVideoToCollection(collectionId, favorite)

    const deleted = collections.deleteCollectionAndOrphanVideos(collectionId)

    expect(deleted).toHaveLength(0)
    expect(videos.getVideo(favorite)).not.toBeNull()
  })

  it('keeps videos that belong to more than one collection', () => {
    const collectionA = collections.upsertImportedCollection('A')
    const collectionB = collections.upsertImportedCollection('B')
    const shared = seedVideo()
    collections.addVideoToCollection(collectionA, shared)
    collections.addVideoToCollection(collectionB, shared)

    const deleted = collections.deleteCollectionAndOrphanVideos(collectionA)

    expect(deleted).toHaveLength(0)
    expect(videos.getVideo(shared)).not.toBeNull()
  })
})

describe('patchCollection', () => {
  it('updates syncEnabled', () => {
    const id = collections.upsertImportedCollection('Trips')
    collections.patchCollection(id, { syncEnabled: false })
    expect(collections.listCollections().find((c) => c.id === id)?.syncEnabled).toBe(false)
  })

  it('is a no-op when syncEnabled is undefined', () => {
    const id = collections.upsertImportedCollection('Trips')
    expect(() => collections.patchCollection(id, {})).not.toThrow()
  })
})

describe('getDownloadedCounts', () => {
  it('counts only downloaded videos per collection', () => {
    const collectionId = collections.upsertImportedCollection('Trips')
    const downloaded = seedVideo()
    const pending = seedVideo()
    collections.addVideoToCollection(collectionId, downloaded)
    collections.addVideoToCollection(collectionId, pending)
    videos.setDownloadResult(downloaded, { status: 'downloaded' })

    expect(collections.getDownloadedCounts()).toEqual({ [collectionId]: 1 })
  })
})

describe('getSyncScopeWhere', () => {
  it('scopes to a single collection when collectionId is given', () => {
    const collectionId = collections.upsertImportedCollection('Trips')
    const inCollection = seedVideo()
    const outside = seedVideo()
    collections.addVideoToCollection(collectionId, inCollection)

    const scope = collections.getSyncScopeWhere(true, collectionId)
    expect(idsMatchingScope(scope, collectionId)).toEqual([inCollection])
    expect(outside).toBeTruthy()
  })

  it('with syncUncategorized=true: includes sync-enabled-collection videos AND uncategorized videos', () => {
    const enabled = collections.upsertImportedCollection('Enabled')
    const disabled = collections.upsertImportedCollection('Disabled')
    collections.patchCollection(disabled, { syncEnabled: false })

    const inEnabled = seedVideo()
    const inDisabled = seedVideo()
    const uncategorized = seedVideo()
    collections.addVideoToCollection(enabled, inEnabled)
    collections.addVideoToCollection(disabled, inDisabled)

    const scope = collections.getSyncScopeWhere(true)
    expect(idsMatchingScope(scope)).toEqual([inEnabled, uncategorized].sort())
  })

  it('with syncUncategorized=false: only sync-enabled-collection videos, uncategorized excluded', () => {
    const enabled = collections.upsertImportedCollection('Enabled')
    const disabled = collections.upsertImportedCollection('Disabled')
    collections.patchCollection(disabled, { syncEnabled: false })

    const inEnabled = seedVideo()
    const inDisabled = seedVideo()
    seedVideo() // uncategorized - must be excluded
    collections.addVideoToCollection(enabled, inEnabled)
    collections.addVideoToCollection(disabled, inDisabled)

    const scope = collections.getSyncScopeWhere(false)
    expect(idsMatchingScope(scope)).toEqual([inEnabled])
  })
})
