import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { runMigrations } from '../../../../src/main/db/migrations'

function columns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
}

describe('runMigrations', () => {
  it('brings a fresh db to user_version 3', () => {
    const db = new Database(':memory:')
    runMigrations(db)
    expect(db.pragma('user_version', { simple: true })).toBe(3)
    db.close()
  })

  it('creates the expected tables', () => {
    const db = new Database(':memory:')
    runMigrations(db)
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(
      (t) => t.name
    )
    expect(tables).toEqual(expect.arrayContaining(['videos', 'collections', 'collection_videos', 'settings']))
    db.close()
  })

  it('is idempotent when re-run against an already-migrated db', () => {
    const db = new Database(':memory:')
    runMigrations(db)
    expect(() => runMigrations(db)).not.toThrow()
    expect(db.pragma('user_version', { simple: true })).toBe(3)
    db.close()
  })

  it('v2 drops the learned column from videos', () => {
    const db = new Database(':memory:')
    runMigrations(db)
    expect(columns(db, 'videos')).not.toContain('learned')
    db.close()
  })
})
