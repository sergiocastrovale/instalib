import { listVideoFilePaths, purgeAllVideoData } from '../db/videos'
import { requestStop, waitForSyncStop } from './downloader'
import { requestCoverStop } from './covers'
import { unlinkQuiet } from './fs-utils'
import type { PurgeOptions } from '@shared/types'

export async function purgeDatabase(opts: PurgeOptions): Promise<{ ok: true }> {
  requestStop()
  requestCoverStop()
  await waitForSyncStop()

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
