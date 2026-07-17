import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { withTempDb, type TempDb } from '../../helpers/db'

const fixtureMp4 = join(__dirname, '..', '..', 'fixtures', 'tiny.mp4')

let temp: TempDb
let videos: typeof import('../../../src/main/db/videos')
let electronMock: typeof import('../../mocks/electron')
let handler: (request: Request) => Promise<Response> | Response
let videoId: string
let fileSize: number

beforeEach(async () => {
  temp = await withTempDb()
  videos = await import('../../../src/main/db/videos')
  electronMock = await import('../../mocks/electron')
  const protocolModule = await import('../../../src/main/protocol')

  protocolModule.registerMediaProtocol()
  const found = electronMock.__getProtocolHandler('app-media')
  if (!found) throw new Error('handler not registered')
  handler = found

  const { id } = videos.upsertVideo({
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: 'a',
    caption: null,
    savedAt: Date.now()
  })
  videoId = id
  videos.setDownloadResult(id, { status: 'downloaded', filePath: fixtureMp4, thumbPath: fixtureMp4 })
  fileSize = (await import('node:fs')).statSync(fixtureMp4).size
})

afterEach(() => {
  temp.dispose()
  electronMock.__resetProtocolHandlers()
})

describe('app-media protocol handler', () => {
  it('serves the full body with 200 when there is no Range header', async () => {
    const res = await handler(new Request(`app-media://video/${videoId}`))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Length')).toBe(String(fileSize))
    expect(res.headers.get('Content-Type')).toBe('video/mp4')
    const buf = await res.arrayBuffer()
    expect(buf.byteLength).toBe(fileSize)
  })

  it('serves a 206 partial response for bytes=0-99', async () => {
    const res = await handler(new Request(`app-media://video/${videoId}`, { headers: { Range: 'bytes=0-99' } }))
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe(`bytes 0-99/${fileSize}`)
    expect(res.headers.get('Content-Length')).toBe('100')
  })

  it('serves an open-ended range bytes=100-', async () => {
    const res = await handler(new Request(`app-media://video/${videoId}`, { headers: { Range: 'bytes=100-' } }))
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe(`bytes 100-${fileSize - 1}/${fileSize}`)
  })

  it('returns 416 when the range start is beyond EOF', async () => {
    const res = await handler(
      new Request(`app-media://video/${videoId}`, { headers: { Range: `bytes=${fileSize + 100}-` } })
    )
    expect(res.status).toBe(416)
    expect(res.headers.get('Content-Range')).toBe(`bytes */${fileSize}`)
  })

  it('returns 416 for a malformed Range header', async () => {
    const res = await handler(new Request(`app-media://video/${videoId}`, { headers: { Range: 'not-a-range' } }))
    expect(res.status).toBe(416)
  })

  it('returns 404 for an unknown host (not video/thumb)', async () => {
    const res = await handler(new Request(`app-media://unknown/${videoId}`))
    expect(res.status).toBe(404)
  })

  it('returns 404 for a missing video id', async () => {
    const res = await handler(new Request('app-media://video/does-not-exist'))
    expect(res.status).toBe(404)
  })

  it('serves thumb host with image/jpeg mime', async () => {
    const res = await handler(new Request(`app-media://thumb/${videoId}`))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })
})
