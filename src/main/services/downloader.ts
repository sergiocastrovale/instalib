import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDb } from '../db/index'
import { getVideo, setDownloadResult } from '../db/videos'
import { getSyncScopeWhere } from '../db/collections'
import { getSettings } from '../db/settings'
import { ytDlpPath, ffmpegPath } from './binaries'
import { unlinkQuiet } from './fs-utils'
import type { SyncEvent } from '@shared/types'

let running = false
let stopRequested = false
let currentVideoId: string | null = null
let currentProc: ChildProcess | null = null
let completedCount = 0
let failedCount = 0
let totalCount = 0
const recentLogs: string[] = []

type EmitFn = (e: SyncEvent) => void
let emitFn: EmitFn = () => {}

export function setSyncEmitter(fn: EmitFn): void {
  emitFn = fn
}

function emit(e: SyncEvent): void {
  emitFn(e)
}

export function isSyncRunning(): boolean {
  return running
}

export function getSyncStatus(): {
  running: boolean
  currentVideoId: string | null
  completed: number
  total: number
  failed: number
} {
  return { running, currentVideoId, completed: completedCount, total: totalCount, failed: failedCount }
}

export function requestStop(): void {
  stopRequested = true
  currentProc?.kill()
}

export function waitForSyncStop(): Promise<void> {
  if (!running) return Promise.resolve()
  return new Promise((resolve) => {
    const check = (): void => {
      if (!running) return resolve()
      setTimeout(check, 50)
    }
    check()
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jitterDelay(): number {
  return 3000 + Math.random() * 3000
}

export function slug(name: string | null | undefined): string {
  if (!name) return 'unknown'
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unknown'
}

function pushLog(message: string): void {
  recentLogs.push(message)
  if (recentLogs.length > 3) recentLogs.shift()
  emit({ type: 'log', message })
}

function runYtDlp(args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(ytDlpPath(), args)
    currentProc = proc
    let stderr = ''
    let buffer = ''
    const handleChunk = (d: Buffer): void => {
      buffer += d.toString()
      const parts = buffer.split(/[\r\n]+/)
      buffer = parts.pop() ?? ''
      for (const line of parts) {
        const trimmed = line.trim()
        if (trimmed) pushLog(trimmed)
      }
    }
    proc.stdout.on('data', handleChunk)
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
      handleChunk(d)
    })
    proc.on('close', (code) => {
      if (currentProc === proc) currentProc = null
      if (buffer.trim()) pushLog(buffer.trim())
      resolve({ code: code ?? 1, stderr })
    })
    proc.on('error', (err: Error) => {
      if (currentProc === proc) currentProc = null
      resolve({ code: 1, stderr: String(err) })
    })
  })
}

async function downloadOne(video: { id: string; shortcode: string; permalink: string; author: string | null }, syncFolder: string, cookiesBrowser: string | null): Promise<void> {
  const baseName = `${slug(video.author)}-${video.shortcode}`
  const outTmpl = join(syncFolder, `${baseName}.%(ext)s`)

  const args = [
    '--no-playlist',
    '--merge-output-format',
    'mp4',
    '--write-thumbnail',
    '--convert-thumbnails',
    'jpg',
    '--write-info-json',
    '--ffmpeg-location',
    ffmpegPath(),
    '-o',
    outTmpl
  ]
  if (cookiesBrowser) args.push('--cookies-from-browser', cookiesBrowser)
  args.push(video.permalink)

  const { code, stderr } = await runYtDlp(args)

  const mp4Path = join(syncFolder, `${baseName}.mp4`)
  const jpgPath = join(syncFolder, `${baseName}.jpg`)
  const infoPath = join(syncFolder, `${baseName}.info.json`)

  if (code !== 0 || !existsSync(mp4Path)) {
    const noVideo = /no video formats found|is not a video|carousel|Requested content is not available/i.test(stderr)
    const status = noVideo ? 'skipped' : 'failed'
    await Promise.all([unlinkQuiet(mp4Path), unlinkQuiet(jpgPath), unlinkQuiet(infoPath)])
    setDownloadResult(video.id, { status, error: stderr.slice(-2000) || 'Unknown yt-dlp error' })
    emit({ type: 'progress', videoId: video.id, message: status })
    return
  }

  let durationSec: number | null = null
  if (existsSync(infoPath)) {
    try {
      const info = JSON.parse(await readFile(infoPath, 'utf-8'))
      durationSec = typeof info.duration === 'number' ? info.duration : null
    } catch {
      // info.json missing/unparsable — keep whatever metadata we already have
    }
  }

  const newThumbPath = existsSync(jpgPath) ? jpgPath : null
  const previousThumbPath = newThumbPath ? getVideo(video.id)?.thumbPath : null

  setDownloadResult(video.id, {
    status: 'downloaded',
    filePath: mp4Path,
    thumbPath: newThumbPath,
    durationSec,
    error: null
  })
  if (previousThumbPath && previousThumbPath !== newThumbPath) {
    await unlinkQuiet(previousThumbPath)
  }
  emit({ type: 'progress', videoId: video.id, message: 'downloaded' })
}

function findNextPending(
  syncUncategorized: boolean,
  collectionId?: string
): { id: string; shortcode: string; permalink: string; author: string | null } | null {
  const db = getDb()
  const scope = getSyncScopeWhere(syncUncategorized, collectionId)
  const row = db
    .prepare(
      `SELECT v.id, v.shortcode, v.permalink, v.author FROM videos v
       WHERE v.status = 'pending' AND ${scope}
       ORDER BY v.saved_at DESC LIMIT 1`
    )
    .get({ collectionId }) as { id: string; shortcode: string; permalink: string; author: string | null } | undefined
  return row ?? null
}

function countPending(syncUncategorized: boolean, collectionId?: string): number {
  const db = getDb()
  const scope = getSyncScopeWhere(syncUncategorized, collectionId)
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM videos v WHERE v.status = 'pending' AND ${scope}`)
    .get({ collectionId }) as { c: number }
  return row.c
}

export async function startSync(collectionId?: string): Promise<void> {
  if (running) return
  running = true
  stopRequested = false
  completedCount = 0
  failedCount = 0

  const settings = getSettings()
  await mkdir(settings.syncFolder, { recursive: true })
  totalCount = countPending(settings.syncUncategorized, collectionId)

  try {
    while (!stopRequested) {
      const freshSettings = getSettings()
      const next = findNextPending(freshSettings.syncUncategorized, collectionId)
      if (!next) break

      setDownloadResult(next.id, { status: 'downloading' })
      currentVideoId = next.id
      recentLogs.length = 0
      emit({ type: 'progress', videoId: next.id, message: 'downloading' })

      const maxAttempts = 2
      let attempt = 0
      let done = false
      while (attempt < maxAttempts && !done && !stopRequested) {
        await downloadOne(next, freshSettings.syncFolder, freshSettings.cookiesBrowser)
        const fresh = getVideo(next.id)
        done = fresh?.status === 'downloaded' || fresh?.status === 'skipped'
        attempt++
        if (!done && attempt < maxAttempts) await sleep(2000 * attempt)
      }

      completedCount++
      if (!done) failedCount++
      const remaining = countPending(freshSettings.syncUncategorized, collectionId)
      totalCount = completedCount + remaining
      emit({ type: 'queue', completed: completedCount, total: totalCount, failed: failedCount })

      if (stopRequested) break
      await sleep(jitterDelay())
    }
  } finally {
    running = false
    currentVideoId = null
    recentLogs.length = 0
    emit({ type: 'idle' })
  }
}
