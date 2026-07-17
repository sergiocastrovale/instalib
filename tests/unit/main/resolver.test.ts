import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { withTempDb, type TempDb } from '../../helpers/db'
import { scriptedProcess } from '../../helpers/child_process'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))

const fixtureMp4 = join(__dirname, '..', '..', 'fixtures', 'tiny.mp4')

let temp: TempDb
let videos: typeof import('../../../src/main/db/videos')
let resolver: typeof import('../../../src/main/services/resolver')
let spawnMock: Mock

beforeEach(async () => {
  temp = await withTempDb()
  videos = await import('../../../src/main/db/videos')
  resolver = await import('../../../src/main/services/resolver')
  const cp = await import('node:child_process')
  spawnMock = cp.spawn as unknown as Mock
  spawnMock.mockReset()
})

afterEach(() => {
  temp.dispose()
})

function seedVideo(overrides: { filePath?: string | null; author?: string | null } = {}): string {
  const { id } = videos.upsertVideo({
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: overrides.author !== undefined ? overrides.author : 'a',
    caption: null,
    savedAt: Date.now()
  })
  if (overrides.filePath) {
    videos.setDownloadResult(id, { status: 'downloaded', filePath: overrides.filePath })
  }
  return id
}

describe('resolvePlayback', () => {
  it('resolves to a local app-media:// source when the file exists on disk, without spawning yt-dlp', async () => {
    const id = seedVideo({ filePath: fixtureMp4 })
    const result = await resolver.resolvePlayback(id)
    expect(result).toEqual({ source: 'local', url: `app-media://video/${id}` })
    expect(spawnMock).not.toHaveBeenCalled()
  })

  it('respects a cached, unexpired resolved URL without spawning yt-dlp', async () => {
    const id = seedVideo()
    videos.setResolvedUrl(id, 'https://cdn/cached.mp4', Date.now() + 60 * 60 * 1000)
    const result = await resolver.resolvePlayback(id)
    expect(result.source).toBe('web')
    expect(result.url).toBe('https://cdn/cached.mp4')
    expect(spawnMock).not.toHaveBeenCalled()
  })

  it('treats a cached URL inside the 10-minute refresh margin as stale and re-resolves', async () => {
    const id = seedVideo()
    videos.setResolvedUrl(id, 'https://cdn/stale.mp4', Date.now() + 5 * 60 * 1000)
    spawnMock.mockImplementation(() =>
      scriptedProcess({ stdout: JSON.stringify({ url: 'https://cdn/fresh.mp4?oe=68123456' }) })
    )
    const result = await resolver.resolvePlayback(id)
    expect(result.url).toBe('https://cdn/fresh.mp4?oe=68123456')
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })

  it('on yt-dlp success: returns web source, caches the URL, and backfills metadata', async () => {
    const id = seedVideo({ author: null })
    spawnMock.mockImplementation(() =>
      scriptedProcess({
        stdout: JSON.stringify({
          url: 'https://cdn/video.mp4?oe=68123456',
          duration: 42,
          uploader: 'someone',
          description: 'a caption'
        })
      })
    )
    const result = await resolver.resolvePlayback(id)
    expect(result.source).toBe('web')
    expect(result.url).toBe('https://cdn/video.mp4?oe=68123456')

    const cached = videos.getResolvedUrl(id)
    expect(cached?.url).toBe('https://cdn/video.mp4?oe=68123456')

    const video = videos.getVideo(id)!
    expect(video.durationSec).toBe(42)
    expect(video.author).toBe('someone')
    expect(video.caption).toBe('a caption')
  })

  it('falls back to embed with the shortcode URL on nonzero yt-dlp exit', async () => {
    const id = seedVideo()
    spawnMock.mockImplementation(() => scriptedProcess({ stderr: 'network error', code: 1 }))
    const result = await resolver.resolvePlayback(id)
    expect(result.source).toBe('embed')
    expect(result.url).toBe('https://www.instagram.com/p/ABC/embed/')
    expect(result.error).toContain('network error')
  })

  it('falls back to embed on unparsable JSON output', async () => {
    const id = seedVideo()
    spawnMock.mockImplementation(() => scriptedProcess({ stdout: 'not json{{{', code: 0 }))
    const result = await resolver.resolvePlayback(id)
    expect(result.source).toBe('embed')
    expect(result.error).toBe('Could not parse yt-dlp output')
  })

  it('dedupes concurrent calls for the same video into a single spawn', async () => {
    const id = seedVideo()
    spawnMock.mockImplementation(() =>
      scriptedProcess({ stdout: JSON.stringify({ url: 'https://cdn/video.mp4?oe=68123456' }) })
    )
    const [a, b] = await Promise.all([resolver.resolvePlayback(id), resolver.resolvePlayback(id)])
    expect(a).toEqual(b)
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })

  it('force=true bypasses both the cache and the in-flight dedupe', async () => {
    const id = seedVideo()
    videos.setResolvedUrl(id, 'https://cdn/cached.mp4', Date.now() + 60 * 60 * 1000)
    spawnMock.mockImplementation(() =>
      scriptedProcess({ stdout: JSON.stringify({ url: 'https://cdn/forced.mp4?oe=68123456' }) })
    )
    const result = await resolver.resolvePlayback(id, true)
    expect(result.url).toBe('https://cdn/forced.mp4?oe=68123456')
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })

  it('returns an embed error when the video does not exist', async () => {
    const result = await resolver.resolvePlayback('nonexistent-id')
    expect(result).toEqual({ source: 'embed', url: '', error: 'Video not found' })
  })
})
