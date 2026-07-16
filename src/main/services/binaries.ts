import { spawn } from 'node:child_process'
import { createWriteStream, existsSync, chmodSync, mkdirSync } from 'node:fs'
import { readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { app } from 'electron'
import AdmZip from 'adm-zip'
import type { SetupProgressEvent } from '@shared/types'

export type ProgressCb = (e: SetupProgressEvent) => void

function binDir(): string {
  const dir = join(app.getPath('userData'), 'bin')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function ytDlpPath(): string {
  return join(binDir(), process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
}

export function ffmpegPath(): string {
  return join(binDir(), process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
}

function ytDlpDownloadUrl(): string {
  const base = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/'
  if (process.platform === 'win32') return `${base}yt-dlp.exe`
  if (process.platform === 'darwin') return `${base}yt-dlp_macos`
  return `${base}yt-dlp_linux`
}

function ffmpegDownloadUrl(): { url: string; kind: 'zip' | 'tarxz' } {
  if (process.platform === 'win32') {
    return {
      url: 'https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip',
      kind: 'zip'
    }
  }
  if (process.platform === 'darwin') {
    return { url: 'https://evermeet.cx/ffmpeg/getrelease/zip', kind: 'zip' }
  }
  return {
    url: 'https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-gpl.tar.xz',
    kind: 'tarxz'
  }
}

async function downloadToFile(url: string, destPath: string, onProgress: (pct: number) => void): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status} ${url}`)
  const total = Number(res.headers.get('content-length') ?? 0)
  let received = 0

  const source = Readable.fromWeb(res.body as never)
  const progressTracker = new Transform({
    transform(chunk: Buffer, _enc, callback) {
      received += chunk.length
      if (total > 0) onProgress(Math.round((received / total) * 100))
      callback(null, chunk)
    }
  })

  await pipeline(source, progressTracker, createWriteStream(destPath))
}

async function extractSingleBinary(
  archivePath: string,
  kind: 'zip' | 'tarxz',
  binaryBasename: string,
  destPath: string
): Promise<void> {
  const extractDir = `${archivePath}.extracted`
  mkdirSync(extractDir, { recursive: true })

  if (kind === 'zip') {
    const zip = new AdmZip(archivePath)
    zip.extractAllTo(extractDir, true)
  } else {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('tar', ['-xJf', archivePath, '-C', extractDir])
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar exited ${code}`))))
      proc.on('error', reject)
    })
  }

  const found = await findFileRecursive(extractDir, binaryBasename)
  if (!found) throw new Error(`${binaryBasename} not found in archive ${archivePath}`)
  await rename(found, destPath)
  if (process.platform !== 'win32') chmodSync(destPath, 0o755)
  await rm(extractDir, { recursive: true, force: true })
  await rm(archivePath, { force: true })
}

async function findFileRecursive(dir: string, basename: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await findFileRecursive(full, basename)
      if (nested) return nested
    } else if (entry.name === basename) {
      return full
    }
  }
  return null
}

export async function ensureYtDlp(onProgress: ProgressCb): Promise<void> {
  if (existsSync(ytDlpPath())) return
  onProgress({ binary: 'yt-dlp', pct: 0, phase: 'downloading' })
  await downloadToFile(ytDlpDownloadUrl(), ytDlpPath(), (pct) =>
    onProgress({ binary: 'yt-dlp', pct, phase: 'downloading' })
  )
  if (process.platform !== 'win32') chmodSync(ytDlpPath(), 0o755)
  onProgress({ binary: 'yt-dlp', pct: 100, phase: 'done' })
}

export async function ensureFfmpeg(onProgress: ProgressCb): Promise<void> {
  if (existsSync(ffmpegPath())) return
  const { url, kind } = ffmpegDownloadUrl()
  onProgress({ binary: 'ffmpeg', pct: 0, phase: 'downloading' })
  const archivePath = join(binDir(), kind === 'zip' ? 'ffmpeg-dl.zip' : 'ffmpeg-dl.tar.xz')
  await downloadToFile(url, archivePath, (pct) => onProgress({ binary: 'ffmpeg', pct, phase: 'downloading' }))
  onProgress({ binary: 'ffmpeg', pct: 100, phase: 'extracting' })
  const binaryBasename = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  await extractSingleBinary(archivePath, kind, binaryBasename, ffmpegPath())
  onProgress({ binary: 'ffmpeg', pct: 100, phase: 'done' })
}

export async function ensureBinaries(onProgress: ProgressCb): Promise<void> {
  await ensureYtDlp(onProgress)
  await ensureFfmpeg(onProgress)
}

export function binariesReady(): { ytDlp: boolean; ffmpeg: boolean } {
  return { ytDlp: existsSync(ytDlpPath()), ffmpeg: existsSync(ffmpegPath()) }
}

export function getYtDlpVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!existsSync(ytDlpPath())) return resolve(null)
    const proc = spawn(ytDlpPath(), ['--version'])
    let out = ''
    proc.stdout.on('data', (d: Buffer) => (out += d.toString()))
    proc.on('close', () => resolve(out.trim() || null))
    proc.on('error', () => resolve(null))
  })
}

export function updateYtDlp(): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    if (!existsSync(ytDlpPath())) return resolve({ code: 1, output: 'yt-dlp not installed' })
    const proc = spawn(ytDlpPath(), ['-U'])
    let output = ''
    proc.stdout.on('data', (d: Buffer) => (output += d.toString()))
    proc.stderr.on('data', (d: Buffer) => (output += d.toString()))
    proc.on('close', (code) => resolve({ code: code ?? 1, output }))
    proc.on('error', (err) => resolve({ code: 1, output: String(err) }))
  })
}
