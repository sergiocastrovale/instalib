import { randomUUID } from 'node:crypto'
import { getDb } from './index'
import type { CollectionDto, CollectionKind } from '@shared/types'

interface CollectionRow {
  id: string
  name: string
  kind: CollectionKind
  sync_enabled: number
  created_at: number
  video_count: number
  cover_video_id: string | null
}

function toDto(row: CollectionRow): CollectionDto {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    syncEnabled: !!row.sync_enabled,
    videoCount: row.video_count,
    coverVideoId: row.cover_video_id,
    createdAt: row.created_at
  }
}

export function listCollections(): CollectionDto[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(*) FROM collection_videos cv WHERE cv.collection_id = c.id) AS video_count,
         (SELECT v.id FROM collection_videos cv JOIN videos v ON v.id = cv.video_id
          WHERE cv.collection_id = c.id AND v.thumb_path IS NOT NULL
          ORDER BY v.saved_at DESC LIMIT 1) AS cover_video_id
       FROM collections c ORDER BY c.kind DESC, c.name COLLATE NOCASE ASC`
    )
    .all() as CollectionRow[]
  return rows.map(toDto)
}

export function upsertImportedCollection(name: string): string {
  const db = getDb()
  const existing = db
    .prepare("SELECT id FROM collections WHERE name = ? AND kind = 'imported'")
    .get(name) as { id: string } | undefined
  if (existing) return existing.id
  const id = randomUUID()
  db.prepare(
    `INSERT INTO collections (id, name, kind, sync_enabled, created_at) VALUES (?, ?, 'imported', 1, ?)`
  ).run(id, name, Date.now())
  return id
}

export function addVideoToCollection(collectionId: string, videoId: string): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO collection_videos (collection_id, video_id, position, added_at)
       VALUES (?, ?, 0, ?)`
    )
    .run(collectionId, videoId, Date.now())
}

export interface OrphanVideoFiles {
  id: string
  filePath: string | null
  thumbPath: string | null
}

export function deleteCollectionAndOrphanVideos(collectionId: string): OrphanVideoFiles[] {
  const db = getDb()

  const orphans = db
    .prepare(
      `SELECT v.id, v.file_path AS filePath, v.thumb_path AS thumbPath
       FROM videos v
       JOIN collection_videos cv ON cv.video_id = v.id AND cv.collection_id = @collectionId
       WHERE v.favorite = 0
         AND (SELECT COUNT(*) FROM collection_videos cv2 WHERE cv2.video_id = v.id) = 1`
    )
    .all({ collectionId }) as OrphanVideoFiles[]

  const run = db.transaction(() => {
    db.prepare('DELETE FROM collections WHERE id = ?').run(collectionId)
    for (const orphan of orphans) {
      db.prepare('DELETE FROM videos WHERE id = ?').run(orphan.id)
    }
  })
  run()

  return orphans
}

export function patchCollection(id: string, patch: { syncEnabled?: boolean }): void {
  if (patch.syncEnabled === undefined) return
  getDb()
    .prepare('UPDATE collections SET sync_enabled = ? WHERE id = ?')
    .run(patch.syncEnabled ? 1 : 0, id)
}

export function getSyncScopeWhere(syncUncategorized: boolean): string {
  return syncUncategorized
    ? `(EXISTS (SELECT 1 FROM collection_videos cv JOIN collections c ON c.id = cv.collection_id
         WHERE cv.video_id = v.id AND c.sync_enabled = 1)
       OR NOT EXISTS (SELECT 1 FROM collection_videos cv WHERE cv.video_id = v.id))`
    : `EXISTS (SELECT 1 FROM collection_videos cv JOIN collections c ON c.id = cv.collection_id
         WHERE cv.video_id = v.id AND c.sync_enabled = 1)`
}
