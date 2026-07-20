import { describe, expect, it } from 'vitest'
import { withTempDb } from '../../helpers/db'

describe('smoke: better-sqlite3 loads under vitest', () => {
  it('opens a db and runs a query', async () => {
    const { db, dispose } = await withTempDb()
    try {
      const info = db.getDbInfo()
      expect(info.engine).toBe('better-sqlite3')
      expect(info.schemaVersion).toBe(3)
    } finally {
      dispose()
    }
  })
})
