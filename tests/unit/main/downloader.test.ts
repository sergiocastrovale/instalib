import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { withTempDb, type TempDb } from '../../helpers/db'
import { manualProcess, scriptedProcess } from '../../helpers/child_process'

// startSync's retry/jitter delays are real setTimeouts. Mixing vi.useFakeTimers()
// with the real fs.promises I/O startSync also does (mkdir, unlink, readFile)
// deadlocks unpredictably - the fake clock can advance past a real await before
// the timer it's waiting on even gets scheduled. Simpler and reliable: pin
// Math.random so jitterDelay() is always its 3s floor, and let the real,
// bounded delays run in real time.
vi.mock('node:child_process', () => ({ spawn: vi.fn() }))

const TEST_TIMEOUT = 15000

let temp: TempDb
let videos: typeof import('../../../src/main/db/videos')
let settingsDb: typeof import('../../../src/main/db/settings')
let downloader: typeof import('../../../src/main/services/downloader')
let spawnMock: Mock

beforeEach(async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  temp = await withTempDb()
  videos = await import('../../../src/main/db/videos')
  settingsDb = await import('../../../src/main/db/settings')
  downloader = await import('../../../src/main/services/downloader')
  const cp = await import('node:child_process')
  spawnMock = cp.spawn as unknown as Mock
  spawnMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  temp.dispose()
})

function seedPendingVideo(author: string, shortcode: string): string {
  const { id } = videos.upsertVideo({
    shortcode,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    author,
    caption: null,
    savedAt: Date.now()
  })
  return id
}

function syncFolderPaths(author: string, shortcode: string): {
  syncFolder: string
  mp4Path: string
  jpgPath: string
  infoPath: string
} {
  const syncFolder = settingsDb.getSettings().syncFolder
  const baseName = `${downloader.slug(author)}-${shortcode}`
  return {
    syncFolder,
    mp4Path: join(syncFolder, `${baseName}.mp4`),
    jpgPath: join(syncFolder, `${baseName}.jpg`),
    infoPath: join(syncFolder, `${baseName}.info.json`)
  }
}

describe('startSync / downloadOne (via startSync)', () => {
  it(
    'success path: marks downloaded, reads duration from .info.json, picks up thumbnail',
    async () => {
      const id = seedPendingVideo('someauthor', 'ABC')
      const { syncFolder, mp4Path, jpgPath, infoPath } = syncFolderPaths('someauthor', 'ABC')
      mkdirSync(syncFolder, { recursive: true })
      // yt-dlp writes its output files as a side effect of a real run; emulate that
      // by pre-placing them before the scripted process "closes".
      writeFileSync(mp4Path, 'mp4 bytes')
      writeFileSync(jpgPath, 'jpg bytes')
      writeFileSync(infoPath, JSON.stringify({ duration: 12.5 }))

      spawnMock.mockImplementation(() => scriptedProcess({ code: 0 }))

      await downloader.startSync()

      const video = videos.getVideo(id)!
      expect(video.status).toBe('downloaded')
      expect(video.filePath).toBe(mp4Path)
      expect(video.thumbPath).toBe(jpgPath)
      expect(video.durationSec).toBe(12.5)
    },
    TEST_TIMEOUT
  )

  it(
    'classifies "no video formats found" stderr as skipped and cleans up partial files',
    async () => {
      const id = seedPendingVideo('someauthor', 'SKP')
      const { syncFolder, mp4Path, jpgPath, infoPath } = syncFolderPaths('someauthor', 'SKP')
      mkdirSync(syncFolder, { recursive: true })
      writeFileSync(mp4Path, 'partial')

      spawnMock.mockImplementation(() => scriptedProcess({ code: 1, stderr: 'ERROR: no video formats found' }))

      await downloader.startSync()

      const video = videos.getVideo(id)!
      expect(video.status).toBe('skipped')
      expect(existsSync(mp4Path)).toBe(false)
      expect(existsSync(jpgPath)).toBe(false)
      expect(existsSync(infoPath)).toBe(false)
      expect(spawnMock).toHaveBeenCalledTimes(1) // "skipped" is done=true, no retry
    },
    TEST_TIMEOUT
  )

  it(
    'classifies a carousel error as skipped too',
    async () => {
      const id = seedPendingVideo('someauthor', 'CAR')
      const { syncFolder } = syncFolderPaths('someauthor', 'CAR')
      mkdirSync(syncFolder, { recursive: true })

      spawnMock.mockImplementation(() => scriptedProcess({ code: 1, stderr: 'this post is a carousel' }))

      await downloader.startSync()

      expect(videos.getVideo(id)!.status).toBe('skipped')
    },
    TEST_TIMEOUT
  )

  it(
    'classifies other stderr as failed after exhausting retries',
    async () => {
      const id = seedPendingVideo('someauthor', 'FAI')
      const { syncFolder } = syncFolderPaths('someauthor', 'FAI')
      mkdirSync(syncFolder, { recursive: true })

      spawnMock.mockImplementation(() => scriptedProcess({ code: 1, stderr: 'some unexpected yt-dlp error' }))

      await downloader.startSync()

      const video = videos.getVideo(id)!
      expect(video.status).toBe('failed')
      expect(video.error).toContain('some unexpected yt-dlp error')
      expect(spawnMock).toHaveBeenCalledTimes(2) // maxAttempts, both failed
    },
    TEST_TIMEOUT
  )

  it(
    'requestStop kills the in-flight process and stops the loop',
    async () => {
      const id = seedPendingVideo('someauthor', 'STP')
      const { syncFolder } = syncFolderPaths('someauthor', 'STP')
      mkdirSync(syncFolder, { recursive: true })

      const proc = manualProcess()
      spawnMock.mockImplementation(() => proc)

      const runPromise = downloader.startSync()
      await vi.waitFor(() => expect(spawnMock).toHaveBeenCalled())

      downloader.requestStop()
      expect(proc.kill).toHaveBeenCalled()

      proc.close(1)
      await runPromise

      expect(downloader.getSyncStatus().running).toBe(false)
      expect(videos.getVideo(id)!.status).toBe('failed')
    },
    TEST_TIMEOUT
  )
})
