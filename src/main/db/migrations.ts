import type Database from 'better-sqlite3'

const MIGRATIONS: string[] = [
  // v1
  `
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
    learned INTEGER NOT NULL DEFAULT 0,
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
  `,
  // v2
  `
  ALTER TABLE videos DROP COLUMN learned;
  `
]

export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number
  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    const migration = MIGRATIONS[v]
    const applyMigration = db.transaction(() => {
      db.exec(migration)
      db.pragma(`user_version = ${v + 1}`)
    })
    applyMigration()
  }
}
