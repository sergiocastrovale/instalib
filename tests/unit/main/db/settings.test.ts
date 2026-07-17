import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { withTempDb, type TempDb } from '../../../helpers/db'

let temp: TempDb
let settings: typeof import('../../../../src/main/db/settings')
let electronMock: typeof import('../../../mocks/electron')

beforeEach(async () => {
  temp = await withTempDb()
  settings = await import('../../../../src/main/db/settings')
  electronMock = await import('../../../mocks/electron')
})

afterEach(() => {
  temp.dispose()
})

describe('getSettings defaults', () => {
  it('defaults theme to dark', () => {
    expect(settings.getSettings().theme).toBe('dark')
  })

  it('coerces any non-"light" stored theme value to dark', () => {
    settings.setSetting('theme', 'not-a-real-theme')
    expect(settings.getSettings().theme).toBe('dark')
  })

  it('accepts a stored "light" theme', () => {
    settings.setSetting('theme', 'light')
    expect(settings.getSettings().theme).toBe('light')
  })

  it('falls back syncFolder to app.getPath("videos")/Instalib when unset', () => {
    const videosDir = electronMock.app.getPath('videos')
    expect(settings.getSettings().syncFolder).toBe(join(videosDir, 'Instalib'))
  })

  it('defaults syncUncategorized to true and setupComplete to false', () => {
    const s = settings.getSettings()
    expect(s.syncUncategorized).toBe(true)
    expect(s.setupComplete).toBe(false)
  })

  it('defaults cookiesBrowser and ytDlpVersion to null', () => {
    const s = settings.getSettings()
    expect(s.cookiesBrowser).toBeNull()
    expect(s.ytDlpVersion).toBeNull()
  })
})

describe('setSettings', () => {
  it('round-trips a full patch', () => {
    const result = settings.setSettings({
      syncFolder: '/custom/folder',
      cookiesBrowser: 'chrome',
      syncUncategorized: false,
      ytDlpVersion: '2024.01.01',
      setupComplete: true,
      theme: 'light'
    })
    expect(result).toEqual({
      syncFolder: '/custom/folder',
      cookiesBrowser: 'chrome',
      syncUncategorized: false,
      ytDlpVersion: '2024.01.01',
      setupComplete: true,
      theme: 'light'
    })
    expect(settings.getSettings()).toEqual(result)
  })

  it('treats an explicit null cookiesBrowser as "clear"', () => {
    settings.setSettings({ cookiesBrowser: 'chrome' })
    settings.setSettings({ cookiesBrowser: null })
    expect(settings.getSettings().cookiesBrowser).toBeNull()
  })

  it('leaves unspecified fields untouched', () => {
    settings.setSettings({ theme: 'light' })
    settings.setSettings({ syncFolder: '/only/this/changes' })
    expect(settings.getSettings().theme).toBe('light')
  })
})
