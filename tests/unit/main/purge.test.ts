import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { withTempDb, type TempDb } from '../../helpers/db'

let temp: TempDb
let videos: typeof import('../../../src/main/db/videos')
let purge: typeof import('../../../src/main/services/purge')
let filesDir: string

beforeEach(async () => {
  temp = await withTempDb()
  videos = await import('../../../src/main/db/videos')
  purge = await import('../../../src/main/services/purge')
  filesDir = mkdtempSync(join(tmpdir(), 'instalib-purge-'))
})

afterEach(() => {
  temp.dispose()
})

function seedDownloadedVideo(): { filePath: string; infoPath: string; thumbPath: string } {
  const { id } = videos.upsertVideo({
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: 'a',
    caption: null,
    savedAt: 1
  })
  const filePath = join(filesDir, 'ABC.mp4')
  const infoPath = join(filesDir, 'ABC.info.json')
  const thumbPath = join(filesDir, 'ABC.jpg')
  writeFileSync(filePath, 'video')
  writeFileSync(infoPath, '{}')
  writeFileSync(thumbPath, 'jpg')
  videos.setDownloadResult(id, { status: 'downloaded', filePath, thumbPath })
  return { filePath, infoPath, thumbPath }
}

describe('purgeDatabase', () => {
  it('removeVideos: true, removeCovers: true deletes video/info/thumb files and all DB rows', async () => {
    const { filePath, infoPath, thumbPath } = seedDownloadedVideo()

    const result = await purge.purgeDatabase({ removeVideos: true, removeCovers: true })

    expect(result).toEqual({ ok: true })
    expect(existsSync(filePath)).toBe(false)
    expect(existsSync(infoPath)).toBe(false)
    expect(existsSync(thumbPath)).toBe(false)
    expect(videos.listVideos({})).toEqual([])
  })

  it('removeVideos: false leaves video files on disk but still clears the DB', async () => {
    const { filePath, thumbPath } = seedDownloadedVideo()

    await purge.purgeDatabase({ removeVideos: false, removeCovers: true })

    expect(existsSync(filePath)).toBe(true)
    expect(existsSync(thumbPath)).toBe(false)
    expect(videos.listVideos({})).toEqual([])
  })

  it('removeCovers: false leaves thumb files on disk but still clears the DB', async () => {
    const { filePath, thumbPath } = seedDownloadedVideo()

    await purge.purgeDatabase({ removeVideos: true, removeCovers: false })

    expect(existsSync(filePath)).toBe(false)
    expect(existsSync(thumbPath)).toBe(true)
    expect(videos.listVideos({})).toEqual([])
  })

  it('always clears the DB, even with both remove flags false', async () => {
    seedDownloadedVideo()
    await purge.purgeDatabase({ removeVideos: false, removeCovers: false })
    expect(videos.listVideos({})).toEqual([])
  })
})
