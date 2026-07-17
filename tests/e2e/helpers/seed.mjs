#!/usr/bin/env node
// Seeds a fresh instalib.db for e2e tests. Must run under Electron's Node
// (same ABI issue as the unit tests - see docs/tests.md constraint #1).
// Usage: node seed.mjs <portableExecutableDir>
import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const portableDir = process.argv[2]
if (!portableDir) throw new Error('usage: seed.mjs <portableExecutableDir>')

const dataDir = join(portableDir, 'Instalib-Data')
mkdirSync(dataDir, { recursive: true })
const dbPath = join(dataDir, 'instalib.db')

const fixturesDir = join(__dirname, '..', '..', 'fixtures')
const fixtureCoverPath = join(fixturesDir, 'cover.jpg')
const fixtureVideoPath = join(fixturesDir, 'tiny.mp4')
if (!existsSync(fixtureCoverPath) || !existsSync(fixtureVideoPath)) {
  throw new Error('Run `node scripts/make-fixtures.mjs` before seeding e2e data (missing cover.jpg/tiny.mp4).')
}

// The app deletes files at a video's file_path/thumb_path on collection
// removal and purge - never point seeded rows at the checked-in fixtures
// directly, or a delete/purge flow under test will unlink the real fixture.
// Copy them into this run's own throwaway data dir instead.
const seedAssetsDir = join(dataDir, 'seed-assets')
mkdirSync(seedAssetsDir, { recursive: true })
const coverPath = join(seedAssetsDir, 'cover.jpg')
const videoPath = join(seedAssetsDir, 'tiny.mp4')
copyFileSync(fixtureCoverPath, coverPath)
copyFileSync(fixtureVideoPath, videoPath)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Mirrors src/main/db/migrations.ts's post-migration (v2) schema - the app's
// own migrations no-op once user_version is already at the latest version.
db.exec(`
  CREATE TABLE videos (
    id TEXT PRIMARY KEY,
    shortcode TEXT NOT NULL UNIQUE,
    permalink TEXT NOT NULL,
    author TEXT,
    caption TEXT,
    saved_at INTEGER NOT NULL,
    duration_sec REAL,
    file_path TEXT,
    thumb_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    position_sec REAL NOT NULL DEFAULT 0,
    speed REAL NOT NULL DEFAULT 1,
    watched INTEGER NOT NULL DEFAULT 0,
    favorite INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    resolved_url TEXT,
    resolved_url_expires_at INTEGER,
    last_played_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_videos_status ON videos(status);
  CREATE INDEX idx_videos_saved_at ON videos(saved_at);
  CREATE INDEX idx_videos_favorite ON videos(favorite) WHERE favorite = 1;

  CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'imported',
    sync_enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    UNIQUE (name, kind)
  );

  CREATE TABLE collection_videos (
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (collection_id, video_id)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)
db.pragma('user_version = 2')

const now = Date.now()
const insertVideo = db.prepare(`
  INSERT INTO videos (
    id, shortcode, permalink, author, caption, saved_at, duration_sec,
    file_path, thumb_path, status, error, position_sec, speed, watched,
    favorite, notes, last_played_at, created_at, updated_at
  ) VALUES (
    @id, @shortcode, @permalink, @author, @caption, @savedAt, @durationSec,
    @filePath, @thumbPath, @status, @error, @positionSec, @speed, @watched,
    @favorite, @notes, @lastPlayedAt, @createdAt, @updatedAt
  )
`)

const AUTHORS = ['wombat_watcher', 'travel_by_train', 'kitchen_diaries', 'city_lights', 'quiet_hikes']
const STATUSES = ['pending', 'downloaded', 'failed']

const videos = []
for (let i = 0; i < 15; i++) {
  const id = randomUUID()
  const shortcode = `SEED${String(i).padStart(3, '0')}`
  const downloaded = i < 2 // first 2 videos are locally downloaded
  const status = downloaded ? 'downloaded' : STATUSES[i % STATUSES.length]
  const video = {
    id,
    shortcode,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    author: AUTHORS[i % AUTHORS.length],
    caption: `Seeded caption for ${shortcode}`,
    savedAt: now - i * 3_600_000,
    durationSec: 30 + i * 5,
    filePath: downloaded ? videoPath : null,
    thumbPath: coverPath, // every video has a thumb - keeps startup cover fetch quiet
    status,
    error: status === 'failed' ? 'stubbed failure' : null,
    positionSec: i === 2 ? 15 : 0, // one video mid-watched, for "continue watching"
    speed: 1,
    watched: i === 5 ? 1 : 0,
    favorite: i < 3 ? 1 : 0, // first 3 are favorites
    notes: '',
    lastPlayedAt: i === 2 ? now : null,
    createdAt: now - i * 3_600_000,
    updatedAt: now - i * 3_600_000
  }
  insertVideo.run(video)
  videos.push(video)
}

const insertCollection = db.prepare(`
  INSERT INTO collections (id, name, kind, sync_enabled, created_at) VALUES (@id, @name, 'imported', 1, @createdAt)
`)
const insertMembership = db.prepare(`
  INSERT INTO collection_videos (collection_id, video_id, position, added_at) VALUES (@collectionId, @videoId, @position, @addedAt)
`)

const collections = [
  { id: randomUUID(), name: 'Trips' },
  { id: randomUUID(), name: 'Food' }
]
for (const c of collections) {
  insertCollection.run({ ...c, createdAt: now })
}
// first 5 videos into Trips, next 4 into Food (some overlap with favorites)
videos.slice(0, 5).forEach((v, i) => insertMembership.run({ collectionId: collections[0].id, videoId: v.id, position: i, addedAt: now }))
videos.slice(5, 9).forEach((v, i) => insertMembership.run({ collectionId: collections[1].id, videoId: v.id, position: i, addedAt: now }))

const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
insertSetting.run('syncFolder', join(dataDir, 'synced'))
insertSetting.run('syncUncategorized', 'true')
insertSetting.run('setupComplete', 'true')
insertSetting.run('theme', 'dark')

db.close()
console.log(`Seeded ${videos.length} videos and ${collections.length} collections at ${dbPath}`)
