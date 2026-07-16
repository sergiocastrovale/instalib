import { deleteCollectionAndOrphanVideos } from '../db/collections'
import { unlinkQuiet } from './purge'

export async function deleteCollection(collectionId: string): Promise<{ ok: true }> {
  const orphans = deleteCollectionAndOrphanVideos(collectionId)

  const deletions: Promise<void>[] = []
  for (const orphan of orphans) {
    if (orphan.filePath) {
      deletions.push(unlinkQuiet(orphan.filePath))
      deletions.push(unlinkQuiet(orphan.filePath.replace(/\.mp4$/, '.info.json')))
    }
    if (orphan.thumbPath) {
      deletions.push(unlinkQuiet(orphan.thumbPath))
    }
  }
  await Promise.all(deletions)

  return { ok: true }
}
