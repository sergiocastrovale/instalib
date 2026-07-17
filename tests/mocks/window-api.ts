import { vi } from 'vitest'
import type { PreloadApi } from '../../src/preload/index'

export function createApiMock(): PreloadApi {
  return {
    videosList: vi.fn(async () => []),
    videosGet: vi.fn(async () => null),
    videosPatch: vi.fn(async () => null),
    videosRetry: vi.fn(async () => {}),

    collectionsList: vi.fn(async () => []),
    collectionsDelete: vi.fn(async () => ({ ok: true as const })),
    collectionsPatch: vi.fn(async () => {}),
    collectionsDownloadedCounts: vi.fn(async () => ({})),

    importZip: vi.fn(async () => ({ imported: 0, updated: 0, total: 0, collections: 0 })),

    playerResolve: vi.fn(async () => ({ source: 'embed' as const, url: '' })),

    syncStart: vi.fn(async () => {}),
    syncStop: vi.fn(async () => {}),
    syncStatus: vi.fn(async () => ({ running: false, currentVideoId: null, completed: 0, total: 0, failed: 0 })),
    onSyncEvent: vi.fn(() => () => {}),

    coverFetchStop: vi.fn(async () => {}),
    coverFetchStatus: vi.fn(async () => ({
      running: false,
      currentVideoId: null,
      currentLabel: null,
      covered: 0,
      total: 0
    })),
    onCoverFetchEvent: vi.fn(() => () => {}),

    settingsGet: vi.fn(async () => ({
      syncFolder: '',
      cookiesBrowser: null,
      syncUncategorized: true,
      ytDlpVersion: null,
      setupComplete: true,
      theme: 'dark' as const
    })),
    settingsSet: vi.fn(async () => ({
      syncFolder: '',
      cookiesBrowser: null,
      syncUncategorized: true,
      ytDlpVersion: null,
      setupComplete: true,
      theme: 'dark' as const
    })),
    settingsPickSyncFolder: vi.fn(async () => null),
    settingsDetectBrowsers: vi.fn(async () => []),
    settingsDataLocation: vi.fn(async () => ({ path: '/tmp/instalib-test', portable: false })),

    dbPurge: vi.fn(async () => ({ ok: true as const })),
    dbInfo: vi.fn(async () => ({ engine: 'better-sqlite3', sqliteVersion: '3.0.0', schemaVersion: 2 })),

    setupStatus: vi.fn(async () => ({
      ytDlp: true,
      ffmpeg: true,
      ytDlpVersion: '2024.01.01',
      ffmpegVersion: '6.0'
    })),
    setupInstall: vi.fn(async () => {}),
    setupUpdateYtDlp: vi.fn(async () => ({ version: '2024.01.01' })),
    onSetupProgress: vi.fn(() => () => {}),

    shellOpenExternal: vi.fn(async () => {}),

    getPathForFile: vi.fn(() => '/tmp/fake-path'),

    getAppVersion: vi.fn(async () => '0.1.0'),
    windowMinimize: vi.fn(async () => {}),
    windowToggleMaximize: vi.fn(async () => {}),
    windowClose: vi.fn(async () => {}),
    windowIsMaximized: vi.fn(async () => false),
    onWindowMaximizedChanged: vi.fn(() => () => {})
  }
}
