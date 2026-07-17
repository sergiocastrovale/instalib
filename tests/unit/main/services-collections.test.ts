import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { withTempDb, type TempDb } from '../../helpers/db'

let temp: TempDb
let videos: typeof import('../../../src/main/db/videos')
let collectionsDb: typeof import('../../../src/main/db/collections')
let collectionsService: typeof import('../../../src/main/services/collections')
let filesDir: string

beforeEach(async () => {
  temp = await withTempDb()
  videos = await import('../../../src/main/db/videos')
  collectionsDb = await import('../../../src/main/db/collections')
  collectionsService = await import('../../../src/main/services/collections')
  filesDir = mkdtempSync(join(tmpdir(), 'instalib-files-'))
})

afterEach(() => {
  temp.dispose()
})

describe('deleteCollection (service)', () => {
  it('deletes the collection row and disk files for orphaned videos', async () => {
    const collectionId = collectionsDb.upsertImportedCollection('Trips')
    const { id: videoId } = videos.upsertVideo({
      shortcode: 'ABC',
      permalink: 'https://www.instagram.com/p/ABC/',
      author: 'a',
      caption: null,
      savedAt: 1
    })
    collectionsDb.addVideoToCollection(collectionId, videoId)

    const filePath = join(filesDir, 'ABC.mp4')
    const infoPath = join(filesDir, 'ABC.info.json')
    const thumbPath = join(filesDir, 'ABC.jpg')
    writeFileSync(filePath, 'video bytes')
    writeFileSync(infoPath, '{}')
    writeFileSync(thumbPath, 'jpg bytes')
    videos.setDownloadResult(videoId, { status: 'downloaded', filePath, thumbPath })

    await collectionsService.deleteCollection(collectionId)

    expect(videos.getVideo(videoId)).toBeNull()
    expect(existsSync(filePath)).toBe(false)
    expect(existsSync(infoPath)).toBe(false)
    expect(existsSync(thumbPath)).toBe(false)
  })

  it('does not touch disk when the collection has no orphaned videos', async () => {
    const collectionId = collectionsDb.upsertImportedCollection('Trips')
    const { id: videoId } = videos.upsertVideo({
      shortcode: 'ABC',
      permalink: 'https://www.instagram.com/p/ABC/',
      author: 'a',
      caption: null,
      savedAt: 1
    })
    videos.patchVideo(videoId, { favorite: true })
    collectionsDb.addVideoToCollection(collectionId, videoId)

    const result = await collectionsService.deleteCollection(collectionId)

    expect(result).toEqual({ ok: true })
    expect(videos.getVideo(videoId)).not.toBeNull()
  })
})
