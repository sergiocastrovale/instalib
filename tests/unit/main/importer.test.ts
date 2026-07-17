import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withTempDb, type TempDb } from '../../helpers/db'

vi.mock('../../../src/main/services/covers', () => ({
  startCoverFetch: vi.fn(async () => {}),
  isCoverFetchRunning: vi.fn(() => false)
}))
vi.mock('../../../src/main/services/adopt', () => ({
  adoptExistingFiles: vi.fn(async () => {})
}))

const fixturesDir = join(__dirname, '..', '..', 'fixtures')

let temp: TempDb
let videos: typeof import('../../../src/main/db/videos')
let collections: typeof import('../../../src/main/db/collections')
let importer: typeof import('../../../src/main/services/importer')

beforeEach(async () => {
  temp = await withTempDb()
  videos = await import('../../../src/main/db/videos')
  collections = await import('../../../src/main/db/collections')
  importer = await import('../../../src/main/services/importer')
})

afterEach(() => {
  temp.dispose()
})

describe('importFromPath', () => {
  it('imports from a ZIP export with posts + collections, linking collection membership', async () => {
    const result = await importer.importFromPath(join(fixturesDir, 'export.zip'))

    expect(result.imported).toBe(2) // saved_posts.old.json has 2 valid entries
    expect(result.updated).toBe(0)
    expect(result.total).toBe(2)
    expect(result.collections).toBe(2) // saved_collections.old.json has 2 named collections

    expect(videos.listVideos({}).map((v) => v.shortcode).sort()).toEqual(['ABC123', 'XYZ789'])
    expect(collections.listCollections().map((c) => c.name).sort()).toEqual(['Legacy Named', 'My Collection'])
  })

  it('links a shortcode already present in the DB to an imported collection', async () => {
    // upsertVideo's insert-vs-update detection compares Date.now() at call
    // time to the RETURNING created_at, so the pre-seed and the import below
    // need to land in different milliseconds or the heuristic can't tell them apart.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.setSystemTime(1000)
    videos.upsertVideo({
      shortcode: 'ABC123',
      permalink: 'https://www.instagram.com/p/ABC123/',
      author: 'preexisting',
      caption: null,
      savedAt: 1
    })
    vi.setSystemTime(2000)

    const result = await importer.importFromPath(join(fixturesDir, 'export.zip'))
    vi.useRealTimers()

    expect(result.updated).toBeGreaterThanOrEqual(1)
    const myCollection = collections.listCollections().find((c) => c.name === 'My Collection')!
    const inCollection = videos.listVideos({ collectionId: myCollection.id })
    expect(inCollection.map((v) => v.shortcode)).toEqual(['ABC123'])
  })

  it('imports from a bare JSON file (no ZIP)', async () => {
    const result = await importer.importFromPath(join(fixturesDir, 'saved_posts.old.json'))
    expect(result.imported).toBe(2)
    expect(result.collections).toBe(0)
  })

  it('throws when saved_posts.json is missing from the ZIP', async () => {
    await expect(importer.importFromPath(join(fixturesDir, 'export-no-posts.zip'))).rejects.toThrow(
      'saved_posts.json not found'
    )
  })

  it('throws on a corrupt ZIP archive', async () => {
    const { writeFileSync, mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const dir = mkdtempSync(join(tmpdir(), 'instalib-badzip-'))
    const fakeZipPath = join(dir, 'corrupt.zip')
    writeFileSync(fakeZipPath, 'not actually a zip file')

    await expect(importer.importFromPath(fakeZipPath)).rejects.toThrow('not a valid export ZIP')
  })

  it('throws when the bare file is neither a ZIP nor valid JSON', async () => {
    await expect(importer.importFromPath(join(fixturesDir, 'saved_posts.invalid.json'))).rejects.toThrow(
      'not a valid ZIP or JSON file'
    )
  })
})
