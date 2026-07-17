import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { getVideo, getResolvedUrl, setResolvedUrl, backfillMetadata } from '../db/videos'
import { getSettings } from '../db/settings'
import { ytDlpPath, ffmpegPath } from './binaries'
import type { PlaybackSource } from '@shared/types'

const FALLBACK_TTL_MS = 2 * 60 * 60 * 1000 // 2h
const REFRESH_MARGIN_MS = 10 * 60 * 1000 // 10min

const inFlight = new Map<string, Promise<PlaybackSource>>()

function parseExpiryFromUrl(url: string): number {
  const match = /[?&]oe=([0-9a-fA-F]+)/.exec(url)
  if (!match) return Date.now() + FALLBACK_TTL_MS
  const expiresSec = parseInt(match[1], 16)
  if (!Number.isFinite(expiresSec) || expiresSec <= 0) return Date.now() + FALLBACK_TTL_MS
  return expiresSec * 1000
}

function runYtDlpJson(permalink: string, cookiesBrowser: string | null): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '-f',
      'b[ext=mp4]/b',
      '--ffmpeg-location',
      ffmpegPath()
    ]
    if (cookiesBrowser) args.push('--cookies-from-browser', cookiesBrowser)
    args.push(permalink)

    const proc = spawn(ytDlpPath(), args)
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => (stdout += d.toString()))
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    proc.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
    proc.on('error', (err) => resolve({ code: 1, stdout: '', stderr: String(err) }))
  })
}

async function resolveFresh(videoId: string, force: boolean): Promise<PlaybackSource> {
  const video = getVideo(videoId)
  if (!video) return { source: 'embed', url: '', error: 'Video not found' }

  if (video.filePath && existsSync(video.filePath)) {
    return { source: 'local', url: `app-media://video/${videoId}` }
  }

  if (!force) {
    const cached = getResolvedUrl(videoId)
    if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
      return { source: 'web', url: cached.url, expiresAt: cached.expiresAt }
    }
  }

  const settings = getSettings()
  const { code, stdout, stderr } = await runYtDlpJson(video.permalink, settings.cookiesBrowser)

  if (code !== 0 || !stdout.trim()) {
    const shortcode = video.shortcode
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`
    return { source: 'embed', url: embedUrl, error: stderr.slice(-500) || 'yt-dlp resolution failed' }
  }

  try {
    const info = JSON.parse(stdout) as {
      url?: string
      duration?: number
      uploader?: string
      description?: string
    }
    if (!info.url) throw new Error('no url in yt-dlp output')

    const expiresAt = parseExpiryFromUrl(info.url)
    setResolvedUrl(videoId, info.url, expiresAt)

    if (info.duration || info.uploader || info.description) {
      backfillMetadata(videoId, {
        durationSec: info.duration ?? null,
        author: info.uploader ?? null,
        caption: info.description ?? null
      })
    }

    return { source: 'web', url: info.url, expiresAt }
  } catch {
    const embedUrl = `https://www.instagram.com/p/${video.shortcode}/embed/`
    return { source: 'embed', url: embedUrl, error: 'Could not parse yt-dlp output' }
  }
}

export function resolvePlayback(videoId: string, force = false): Promise<PlaybackSource> {
  if (!force) {
    const existing = inFlight.get(videoId)
    if (existing) return existing
  }

  const promise: Promise<PlaybackSource> = resolveFresh(videoId, force).finally(() => {
    if (inFlight.get(videoId) === promise) inFlight.delete(videoId)
  })
  inFlight.set(videoId, promise)
  return promise
}
