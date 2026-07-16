import { unlink } from 'node:fs/promises'
import { listVideoFilePaths, purgeAllVideoData } from '../db/videos'
import { requestStop } from './downloader'
import { requestCoverStop } from './covers'
import type { PurgeOptions } from '@shared/types'

export async function unlinkQuiet(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch {
    // already gone / never existed — fine
  }
}

export async function purgeDatabase(opts: PurgeOptions): Promise<{ ok: true }> {
  requestStop()
  requestCoverStop()

  const rows = listVideoFilePaths()

  const deletions: Promise<void>[] = []
  for (const row of rows) {
    if (opts.removeVideos && row.filePath) {
      deletions.push(unlinkQuiet(row.filePath))
      deletions.push(unlinkQuiet(row.filePath.replace(/\.mp4$/, '.info.json')))
    }
    if (opts.removeCovers && row.thumbPath) {
      deletions.push(unlinkQuiet(row.thumbPath))
    }
  }
  await Promise.all(deletions)

  purgeAllVideoData()

  return { ok: true }
}
