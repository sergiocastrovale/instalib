import { randomUUID } from 'node:crypto'
import { getDb } from './index'
import type { VideoDto, VideoListQuery, VideoPatch, VideoStatus } from '@shared/types'

interface VideoRow {
  id: string
  shortcode: string
  permalink: string
  author: string | null
  caption: string | null
  saved_at: number
  duration_sec: number | null
  file_path: string | null
  thumb_path: string | null
  status: VideoStatus
  error: string | null
  position_sec: number
  speed: number
  watched: number
  favorite: number
  notes: string
  resolved_url: string | null
  resolved_url_expires_at: number | null
  last_played_at: number | null
  created_at: number
  updated_at: number
}

function toDto(row: VideoRow): VideoDto {
  return {
    id: row.id,
    shortcode: row.shortcode,
    permalink: row.permalink,
    author: row.author,
    caption: row.caption,
    savedAt: row.saved_at,
    durationSec: row.duration_sec,
    filePath: row.file_path,
    thumbPath: row.thumb_path,
    status: row.status,
    error: row.error,
    positionSec: row.position_sec,
    speed: row.speed,
    watched: !!row.watched,
    favorite: !!row.favorite,
    notes: row.notes,
    lastPlayedAt: row.last_played_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listVideos(query: VideoListQuery): VideoDto[] {
  const db = getDb()
  const clauses: string[] = []
  const params: Record<string, unknown> = {}

  let base = 'SELECT v.* FROM videos v'
  if (query.collectionId) {
    base += ' JOIN collection_videos cv ON cv.video_id = v.id AND cv.collection_id = @collectionId'
    params.collectionId = query.collectionId
  }
  if (query.favorites) {
    clauses.push('v.favorite = 1')
  }
  if (query.search) {
    clauses.push('(v.author LIKE @search OR v.caption LIKE @search OR v.notes LIKE @search)')
    params.search = `%${query.search}%`
  }
  if (query.status) {
    clauses.push('v.status = @status')
    params.status = query.status
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
  const sortCol =
    query.sort === 'author'
      ? 'v.author'
      : query.sort === 'lastPlayedAt'
        ? 'v.last_played_at'
        : 'v.saved_at'
  const sql = `${base}${where} ORDER BY ${sortCol} DESC`
  const rows = db.prepare(sql).all(params) as VideoRow[]
  return rows.map(toDto)
}

export function getVideo(id: string): VideoDto | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as VideoRow | undefined
  return row ? toDto(row) : null
}

export function patchVideo(id: string, patch: VideoPatch): VideoDto | null {
  const db = getDb()
  const fields: string[] = []
  const params: Record<string, unknown> = { id }

  if (patch.positionSec !== undefined) {
    fields.push('position_sec = @positionSec')
    params.positionSec = patch.positionSec
  }
  if (patch.speed !== undefined) {
    fields.push('speed = @speed')
    params.speed = patch.speed
  }
  if (patch.watched !== undefined) {
    fields.push('watched = @watched')
    params.watched = patch.watched ? 1 : 0
  }
  if (patch.favorite !== undefined) {
    fields.push('favorite = @favorite')
    params.favorite = patch.favorite ? 1 : 0
  }
  if (patch.notes !== undefined) {
    fields.push('notes = @notes')
    params.notes = patch.notes
  }
  if (fields.length === 0) return getVideo(id)

  fields.push('last_played_at = @lastPlayedAt', 'updated_at = @updatedAt')
  params.lastPlayedAt = Date.now()
  params.updatedAt = Date.now()

  db.prepare(`UPDATE videos SET ${fields.join(', ')} WHERE id = @id`).run(params)
  return getVideo(id)
}

export interface UpsertVideoInput {
  shortcode: string
  permalink: string
  author: string | null
  caption: string | null
  savedAt: number
}

export function upsertVideo(input: UpsertVideoInput): string {
  const db = getDb()
  const existing = db
    .prepare('SELECT id FROM videos WHERE shortcode = ?')
    .get(input.shortcode) as { id: string } | undefined

  if (existing) {
    db.prepare(
      `UPDATE videos SET permalink = @permalink, author = COALESCE(@author, author),
       caption = COALESCE(@caption, caption), updated_at = @updatedAt WHERE id = @id`
    ).run({ ...input, id: existing.id, updatedAt: Date.now() })
    return existing.id
  }

  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO videos (id, shortcode, permalink, author, caption, saved_at, created_at, updated_at)
     VALUES (@id, @shortcode, @permalink, @author, @caption, @savedAt, @createdAt, @updatedAt)`
  ).run({ ...input, id, createdAt: now, updatedAt: now })
  return id
}

export function setResolvedUrl(id: string, url: string, expiresAt: number): void {
  getDb()
    .prepare('UPDATE videos SET resolved_url = ?, resolved_url_expires_at = ? WHERE id = ?')
    .run(url, expiresAt, id)
}

export function getResolvedUrl(id: string): { url: string; expiresAt: number } | null {
  const row = getDb()
    .prepare('SELECT resolved_url, resolved_url_expires_at FROM videos WHERE id = ?')
    .get(id) as { resolved_url: string | null; resolved_url_expires_at: number | null } | undefined
  if (!row?.resolved_url || !row.resolved_url_expires_at) return null
  return { url: row.resolved_url, expiresAt: row.resolved_url_expires_at }
}

export function clearResolvedUrl(id: string): void {
  getDb()
    .prepare('UPDATE videos SET resolved_url = NULL, resolved_url_expires_at = NULL WHERE id = ?')
    .run(id)
}

export function setDownloadResult(
  id: string,
  data: {
    status: VideoStatus
    filePath?: string | null
    thumbPath?: string | null
    durationSec?: number | null
    error?: string | null
  }
): void {
  getDb()
    .prepare(
      `UPDATE videos SET status = @status, file_path = COALESCE(@filePath, file_path),
       thumb_path = COALESCE(@thumbPath, thumb_path),
       duration_sec = COALESCE(@durationSec, duration_sec),
       error = @error, updated_at = @updatedAt, resolved_url = NULL, resolved_url_expires_at = NULL
       WHERE id = @id`
    )
    .run({
      id,
      status: data.status,
      filePath: data.filePath ?? null,
      thumbPath: data.thumbPath ?? null,
      durationSec: data.durationSec ?? null,
      error: data.error ?? null,
      updatedAt: Date.now()
    })
}

export function backfillMetadata(
  id: string,
  data: { durationSec?: number | null; author?: string | null; caption?: string | null }
): void {
  getDb()
    .prepare(
      `UPDATE videos SET
       duration_sec = COALESCE(duration_sec, @durationSec),
       author = COALESCE(author, @author),
       caption = COALESCE(caption, @caption),
       updated_at = @updatedAt
       WHERE id = @id`
    )
    .run({
      id,
      durationSec: data.durationSec ?? null,
      author: data.author ?? null,
      caption: data.caption ?? null,
      updatedAt: Date.now()
    })
}

export function setCoverPath(id: string, thumbPath: string): void {
  getDb()
    .prepare(
      'UPDATE videos SET thumb_path = COALESCE(thumb_path, @thumbPath), updated_at = @updatedAt WHERE id = @id'
    )
    .run({ id, thumbPath, updatedAt: Date.now() })
}

export function listVideosNeedingCover(): { id: string; shortcode: string; permalink: string; author: string | null }[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, shortcode, permalink, author FROM videos WHERE thumb_path IS NULL ORDER BY saved_at DESC`
    )
    .all() as { id: string; shortcode: string; permalink: string; author: string | null }[]
}

export function countCoverStats(): { covered: number; total: number } {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS total, COUNT(thumb_path) AS covered FROM videos')
    .get() as { total: number; covered: number }
  return row
}

export function listVideoFilePaths(): { filePath: string | null; thumbPath: string | null }[] {
  return getDb()
    .prepare('SELECT file_path AS filePath, thumb_path AS thumbPath FROM videos')
    .all() as { filePath: string | null; thumbPath: string | null }[]
}

export interface AdoptableVideo {
  id: string
  shortcode: string
  author: string | null
  filePath: string | null
  thumbPath: string | null
}

export function listAdoptableVideos(): AdoptableVideo[] {
  return getDb()
    .prepare('SELECT id, shortcode, author, file_path AS filePath, thumb_path AS thumbPath FROM videos')
    .all() as AdoptableVideo[]
}

export function purgeAllVideoData(): void {
  const db = getDb()
  const run = db.transaction(() => {
    db.prepare('DELETE FROM collection_videos').run()
    db.prepare('DELETE FROM collections').run()
    db.prepare('DELETE FROM videos').run()
  })
  run()
}

export function resetToPending(id: string): void {
  getDb()
    .prepare("UPDATE videos SET status = 'pending', error = NULL, updated_at = ? WHERE id = ?")
    .run(Date.now(), id)
}
