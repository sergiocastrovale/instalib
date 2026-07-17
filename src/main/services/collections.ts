import { deleteCollectionAndOrphanVideos } from '../db/collections'
import { unlinkQuiet, infoJsonPath } from './fs-utils'

export async function deleteCollection(collectionId: string): Promise<{ ok: true }> {
  const orphans = deleteCollectionAndOrphanVideos(collectionId)

  const deletions: Promise<void>[] = []
  for (const orphan of orphans) {
    if (orphan.filePath) {
      deletions.push(unlinkQuiet(orphan.filePath))
      deletions.push(unlinkQuiet(infoJsonPath(orphan.filePath)))
    }
    if (orphan.thumbPath) {
      deletions.push(unlinkQuiet(orphan.thumbPath))
    }
  }
  await Promise.all(deletions)

  return { ok: true }
}
