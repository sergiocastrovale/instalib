import { readFileSync } from 'node:fs'
import AdmZip from 'adm-zip'
import { parseSavedCollections, parseSavedPosts } from './instagram'
import { upsertVideo } from '../db/videos'
import { upsertImportedCollection, addVideoToCollection } from '../db/collections'
import { getDb } from '../db/index'
import { startCoverFetch, isCoverFetchRunning } from './covers'
import { adoptExistingFiles } from './adopt'
import type { ImportResult } from '@shared/types'

export async function importFromPath(filePath: string): Promise<ImportResult> {
  const lower = filePath.toLowerCase()
  let postsJson: unknown = null
  let collectionsJson: unknown = null

  if (lower.endsWith('.zip')) {
    try {
      const zip = new AdmZip(filePath)
      for (const entry of zip.getEntries()) {
        const entryLower = entry.entryName.toLowerCase()
        if (entryLower.endsWith('saved_posts.json')) {
          postsJson = JSON.parse(zip.readAsText(entry))
        } else if (entryLower.endsWith('saved_collections.json')) {
          collectionsJson = JSON.parse(zip.readAsText(entry))
        }
      }
    } catch {
      throw new Error('File is not a valid export ZIP (corrupt archive or malformed JSON inside)')
    }
    if (!postsJson) {
      throw new Error('saved_posts.json not found in export ZIP')
    }
  } else {
    const raw = readFileSync(filePath, 'utf-8')
    try {
      postsJson = JSON.parse(raw)
    } catch {
      throw new Error('File is not a valid ZIP or JSON file')
    }
  }

  const items = parseSavedPosts(postsJson)
  const collections = collectionsJson ? parseSavedCollections(collectionsJson) : []

  const db = getDb()
  let imported = 0
  let updated = 0
  const shortcodeToId = new Map<string, string>()

  const runImport = db.transaction(() => {
    for (const item of items) {
      const existingId = db
        .prepare('SELECT id FROM videos WHERE shortcode = ?')
        .get(item.shortcode) as { id: string } | undefined
      const id = upsertVideo({
        shortcode: item.shortcode,
        permalink: item.permalink,
        author: item.author ?? null,
        caption: null,
        savedAt: item.savedAt.getTime()
      })
      shortcodeToId.set(item.shortcode, id)
      if (existingId) updated++
      else imported++
    }

    let collectionsLinked = 0
    for (const col of collections) {
      if (col.shortcodes.length === 0) continue
      const collectionId = upsertImportedCollection(col.name)
      let linkedAny = false
      for (const sc of col.shortcodes) {
        const videoId =
          shortcodeToId.get(sc) ??
          (db.prepare('SELECT id FROM videos WHERE shortcode = ?').get(sc) as { id: string } | undefined)?.id
        if (!videoId) continue
        addVideoToCollection(collectionId, videoId)
        linkedAny = true
      }
      if (linkedAny) collectionsLinked++
    }
    return collectionsLinked
  })

  const collectionsLinked = runImport()

  await adoptExistingFiles()
  if (!isCoverFetchRunning()) startCoverFetch()

  return {
    imported,
    updated,
    total: items.length,
    collections: collectionsLinked
  }
}
