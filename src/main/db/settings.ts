import { app } from 'electron'
import { join } from 'node:path'
import { getDb } from './index'
import type { Settings } from '@shared/types'

const DEFAULTS: Record<string, string> = {
  syncFolder: '',
  cookiesBrowser: '',
  syncUncategorized: 'true',
  ytDlpVersion: '',
  setupComplete: 'false',
  theme: 'dark'
}

function defaultSyncFolder(): string {
  return join(app.getPath('videos'), 'Instalib')
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row ? row.value : null
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(key, value)
}

export function getSettings(): Settings {
  const syncFolder = getSetting('syncFolder') || defaultSyncFolder()
  const cookiesBrowser = getSetting('cookiesBrowser')
  const syncUncategorized = (getSetting('syncUncategorized') ?? DEFAULTS.syncUncategorized) === 'true'
  const ytDlpVersion = getSetting('ytDlpVersion')
  const setupComplete = getSetting('setupComplete') === 'true'
  const theme = (getSetting('theme') ?? DEFAULTS.theme) === 'light' ? 'light' : 'dark'
  return {
    syncFolder,
    cookiesBrowser: cookiesBrowser || null,
    syncUncategorized,
    ytDlpVersion: ytDlpVersion || null,
    setupComplete,
    theme
  }
}

export function setSettings(patch: Partial<Settings>): Settings {
  if (patch.syncFolder !== undefined) setSetting('syncFolder', patch.syncFolder)
  if (patch.cookiesBrowser !== undefined) setSetting('cookiesBrowser', patch.cookiesBrowser ?? '')
  if (patch.syncUncategorized !== undefined)
    setSetting('syncUncategorized', String(patch.syncUncategorized))
  if (patch.ytDlpVersion !== undefined) setSetting('ytDlpVersion', patch.ytDlpVersion ?? '')
  if (patch.setupComplete !== undefined) setSetting('setupComplete', String(patch.setupComplete))
  if (patch.theme !== undefined) setSetting('theme', patch.theme)
  return getSettings()
}
