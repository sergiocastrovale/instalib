import { randomUUID } from 'node:crypto'
import { getDb } from './index'
import type { PlaylistDto, PlaylistKind } from '@shared/types'

interface PlaylistRow {
  id: string
  name: string
  kind: PlaylistKind
  sync_enabled: number
  created_at: number
  video_count: number
  cover_video_id: string | null
}

function toDto(row: PlaylistRow): PlaylistDto {
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

export function listPlaylists(): PlaylistDto[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT p.*,
         (SELECT COUNT(*) FROM playlist_videos pv WHERE pv.playlist_id = p.id) AS video_count,
         (SELECT v.id FROM playlist_videos pv JOIN videos v ON v.id = pv.video_id
          WHERE pv.playlist_id = p.id AND v.thumb_path IS NOT NULL
          ORDER BY v.saved_at DESC LIMIT 1) AS cover_video_id
       FROM playlists p ORDER BY p.kind DESC, p.name COLLATE NOCASE ASC`
    )
    .all() as PlaylistRow[]
  return rows.map(toDto)
}

export function upsertImportedPlaylist(name: string): string {
  const db = getDb()
  const existing = db
    .prepare("SELECT id FROM playlists WHERE name = ? AND kind = 'imported'")
    .get(name) as { id: string } | undefined
  if (existing) return existing.id
  const id = randomUUID()
  db.prepare(
    `INSERT INTO playlists (id, name, kind, sync_enabled, created_at) VALUES (?, ?, 'imported', 1, ?)`
  ).run(id, name, Date.now())
  return id
}

export function addVideoToPlaylist(playlistId: string, videoId: string): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO playlist_videos (playlist_id, video_id, position, added_at)
       VALUES (?, ?, 0, ?)`
    )
    .run(playlistId, videoId, Date.now())
}

export interface OrphanVideoFiles {
  id: string
  filePath: string | null
  thumbPath: string | null
}

export function deletePlaylistAndOrphanVideos(playlistId: string): OrphanVideoFiles[] {
  const db = getDb()

  const orphans = db
    .prepare(
      `SELECT v.id, v.file_path AS filePath, v.thumb_path AS thumbPath
       FROM videos v
       JOIN playlist_videos pv ON pv.video_id = v.id AND pv.playlist_id = @playlistId
       WHERE v.favorite = 0
         AND (SELECT COUNT(*) FROM playlist_videos pv2 WHERE pv2.video_id = v.id) = 1`
    )
    .all({ playlistId }) as OrphanVideoFiles[]

  const run = db.transaction(() => {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId)
    for (const orphan of orphans) {
      db.prepare('DELETE FROM videos WHERE id = ?').run(orphan.id)
    }
  })
  run()

  return orphans
}

export function patchPlaylist(id: string, patch: { syncEnabled?: boolean }): void {
  if (patch.syncEnabled === undefined) return
  getDb()
    .prepare('UPDATE playlists SET sync_enabled = ? WHERE id = ?')
    .run(patch.syncEnabled ? 1 : 0, id)
}

export function getSyncScopeWhere(syncUncategorized: boolean): string {
  return syncUncategorized
    ? `(EXISTS (SELECT 1 FROM playlist_videos pv JOIN playlists p ON p.id = pv.playlist_id
         WHERE pv.video_id = v.id AND p.sync_enabled = 1)
       OR NOT EXISTS (SELECT 1 FROM playlist_videos pv WHERE pv.video_id = v.id))`
    : `EXISTS (SELECT 1 FROM playlist_videos pv JOIN playlists p ON p.id = pv.playlist_id
         WHERE pv.video_id = v.id AND p.sync_enabled = 1)`
}
