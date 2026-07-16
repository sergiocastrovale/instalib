import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { protocol } from 'electron'
import { getVideo } from './db/videos'

export function registerMediaSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app-media',
      privileges: { standard: true, stream: true, supportFetchAPI: true, bypassCSP: true }
    }
  ])
}

function mimeFor(kind: 'video' | 'thumb'): string {
  return kind === 'video' ? 'video/mp4' : 'image/jpeg'
}

export function registerMediaProtocol(): void {
  protocol.handle('app-media', async (request) => {
    const url = new URL(request.url)
    // app-media://video/<id> or app-media://thumb/<id>
    const kind = url.hostname as 'video' | 'thumb'
    const id = url.pathname.replace(/^\//, '')

    const video = getVideo(id)
    const path = kind === 'thumb' ? video?.thumbPath : video?.filePath
    if (!video || !path) {
      return new Response('Not found', { status: 404 })
    }

    let size: number
    try {
      size = statSync(path).size
    } catch {
      return new Response('Not found', { status: 404 })
    }

    const range = request.headers.get('range')
    const mime = mimeFor(kind)

    if (!range) {
      const stream = Readable.toWeb(createReadStream(path)) as ReadableStream
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(size),
          'Accept-Ranges': 'bytes'
        }
      })
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range)
    const start = match?.[1] ? parseInt(match[1], 10) : 0
    const end = match?.[2] ? parseInt(match[2], 10) : size - 1
    const chunkSize = end - start + 1

    const stream = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream
    return new Response(stream, {
      status: 206,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes'
      }
    })
  })
}
