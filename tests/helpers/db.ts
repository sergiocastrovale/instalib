import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { vi } from 'vitest'

export interface TempDb {
  dir: string
  db: typeof import('../../src/main/db/index')
  dispose: () => void
}

export async function withTempDb(): Promise<TempDb> {
  const dir = mkdtempSync(join(tmpdir(), 'instalib-db-'))
  vi.resetModules()
  const electronMock = await import('../mocks/electron')
  electronMock.__setUserDataDir(dir)
  const db = await import('../../src/main/db/index')

  return {
    dir,
    db,
    dispose: () => {
      db.closeDb()
      rmSync(dir, { recursive: true, force: true })
    }
  }
}
