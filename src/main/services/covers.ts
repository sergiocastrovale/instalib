import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { listVideosNeedingCover, setCoverPath, countCoverStats } from '../db/videos'
import { getSettings } from '../db/settings'
import { ytDlpPath, ffmpegPath } from './binaries'
import { slug } from './downloader'
import type { SyncEvent, CoverFetchStatus } from '@shared/types'

const FETCH_DELAY_MS = 500

let running = false
let stopRequested = false
let currentVideoId: string | null = null
let currentLabel: string | null = null

type EmitFn = (e: SyncEvent) => void
let emitFn: EmitFn = () => {}

export function setCoverEmitter(fn: EmitFn): void {
  emitFn = fn
}

function emit(e: SyncEvent): void {
  emitFn(e)
}

export function isCoverFetchRunning(): boolean {
  return running
}

export function getCoverStatus(): CoverFetchStatus {
  const { covered, total } = countCoverStats()
  return { running, currentVideoId, currentLabel, covered, total }
}

export function requestCoverStop(): void {
  stopRequested = true
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runYtDlpThumbnailOnly(
  permalink: string,
  outTmpl: string,
  cookiesBrowser: string | null
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const args = [
      '--no-playlist',
      '--skip-download',
      '--write-thumbnail',
      '--convert-thumbnails',
      'jpg',
      '--ffmpeg-location',
      ffmpegPath(),
      '-o',
      outTmpl
    ]
    if (cookiesBrowser) args.push('--cookies-from-browser', cookiesBrowser)
    args.push(permalink)

    const proc = spawn(ytDlpPath(), args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    proc.on('close', (code) => resolve({ code: code ?? 1, stderr }))
    proc.on('error', (err: Error) => resolve({ code: 1, stderr: String(err) }))
  })
}

export async function startCoverFetch(): Promise<void> {
  if (running) return
  running = true
  stopRequested = false

  const settings = getSettings()
  const coversDir = join(settings.syncFolder, 'covers')
  await mkdir(coversDir, { recursive: true })

  try {
    const pending = listVideosNeedingCover()

    for (const video of pending) {
      if (stopRequested) break

      const baseName = `${slug(video.author)}-${video.shortcode}`
      currentVideoId = video.id
      currentLabel = baseName
      emit({ type: 'progress', videoId: video.id, message: 'fetching cover' })

      const freshSettings = getSettings()
      const outTmpl = join(coversDir, `${baseName}.%(ext)s`)
      const jpgPath = join(coversDir, `${baseName}.jpg`)

      await runYtDlpThumbnailOnly(video.permalink, outTmpl, freshSettings.cookiesBrowser)
      if (existsSync(jpgPath)) {
        setCoverPath(video.id, jpgPath)
      }

      const { covered, total } = countCoverStats()
      emit({ type: 'queue', completed: covered, total })

      if (stopRequested) break
      await sleep(FETCH_DELAY_MS)
    }
  } finally {
    running = false
    currentVideoId = null
    currentLabel = null
    emit({ type: 'idle' })
  }
}
