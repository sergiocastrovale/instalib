import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { listAdoptableVideos, setDownloadResult, setCoverPath } from '../db/videos'
import { getSettings } from '../db/settings'
import { slug } from './downloader'

async function readDurationSec(infoPath: string): Promise<number | null> {
  if (!existsSync(infoPath)) return null
  try {
    const info = JSON.parse(await readFile(infoPath, 'utf-8'))
    return typeof info.duration === 'number' ? info.duration : null
  } catch {
    return null
  }
}

export async function adoptExistingFiles(): Promise<void> {
  const settings = getSettings()
  const rows = listAdoptableVideos()

  for (const row of rows) {
    const baseName = `${slug(row.author)}-${row.shortcode}`
    const mp4Path = join(settings.syncFolder, `${baseName}.mp4`)
    const downloadThumbPath = join(settings.syncFolder, `${baseName}.jpg`)
    const coverThumbPath = join(settings.syncFolder, 'covers', `${baseName}.jpg`)
    const infoPath = join(settings.syncFolder, `${baseName}.info.json`)

    const existingThumb = existsSync(downloadThumbPath)
      ? downloadThumbPath
      : existsSync(coverThumbPath)
        ? coverThumbPath
        : null

    if (!row.filePath && existsSync(mp4Path)) {
      const durationSec = await readDurationSec(infoPath)
      setDownloadResult(row.id, {
        status: 'downloaded',
        filePath: mp4Path,
        thumbPath: existingThumb,
        durationSec
      })
    } else if (!row.thumbPath && existingThumb) {
      setCoverPath(row.id, existingThumb)
    }
  }
}
