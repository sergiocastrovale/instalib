import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '@shared/ipc-channels'
import type {
  BrowserOption,
  CoverFetchStatus,
  DataLocation,
  DbInfo,
  ImportResult,
  PlaybackSource,
  CollectionDto,
  PurgeOptions,
  Settings,
  SetupProgressEvent,
  SetupStatus,
  SyncEvent,
  SyncStatus,
  VideoDto,
  VideoListQuery,
  VideoPatch
} from '@shared/types'

const api = {
  videosList: (query: VideoListQuery): Promise<VideoDto[]> => ipcRenderer.invoke(IPC.videosList, query),
  videosGet: (id: string): Promise<VideoDto | null> => ipcRenderer.invoke(IPC.videosGet, id),
  videosPatch: (id: string, patch: VideoPatch): Promise<VideoDto | null> =>
    ipcRenderer.invoke(IPC.videosPatch, id, patch),
  videosRetry: (id: string): Promise<void> => ipcRenderer.invoke(IPC.videosRetry, id),

  collectionsList: (): Promise<CollectionDto[]> => ipcRenderer.invoke(IPC.collectionsList),
  collectionsDelete: (id: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke(IPC.collectionsDelete, id),
  collectionsPatch: (id: string, patch: { syncEnabled?: boolean }): Promise<void> =>
    ipcRenderer.invoke(IPC.collectionsPatch, id, patch),
  collectionsDownloadedCounts: (): Promise<Record<string, number>> =>
    ipcRenderer.invoke(IPC.collectionsDownloadedCounts),

  importZip: (filePath: string): Promise<ImportResult> => ipcRenderer.invoke(IPC.importZip, filePath),

  playerResolve: (videoId: string, force?: boolean): Promise<PlaybackSource> =>
    ipcRenderer.invoke(IPC.playerResolve, videoId, force),

  syncStart: (opts: { collectionId?: string }): Promise<void> => ipcRenderer.invoke(IPC.syncStart, opts),
  syncStop: (): Promise<void> => ipcRenderer.invoke(IPC.syncStop),
  syncStatus: (): Promise<SyncStatus> => ipcRenderer.invoke(IPC.syncStatus),
  onSyncEvent: (cb: (e: SyncEvent) => void): (() => void) => {
    const listener = (_: unknown, e: SyncEvent) => cb(e)
    ipcRenderer.on(IPC.syncEvent, listener)
    return () => ipcRenderer.removeListener(IPC.syncEvent, listener)
  },

  coverFetchStop: (): Promise<void> => ipcRenderer.invoke(IPC.coverFetchStop),
  coverFetchStatus: (): Promise<CoverFetchStatus> => ipcRenderer.invoke(IPC.coverFetchStatus),
  onCoverFetchEvent: (cb: (e: SyncEvent) => void): (() => void) => {
    const listener = (_: unknown, e: SyncEvent) => cb(e)
    ipcRenderer.on(IPC.coverFetchEvent, listener)
    return () => ipcRenderer.removeListener(IPC.coverFetchEvent, listener)
  },

  settingsGet: (): Promise<Settings> => ipcRenderer.invoke(IPC.settingsGet),
  settingsSet: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke(IPC.settingsSet, patch),
  settingsPickSyncFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC.settingsPickSyncFolder),
  settingsDetectBrowsers: (): Promise<BrowserOption[]> => ipcRenderer.invoke(IPC.settingsDetectBrowsers),
  settingsDataLocation: (): Promise<DataLocation> => ipcRenderer.invoke(IPC.settingsDataLocation),

  dbPurge: (opts: PurgeOptions): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.dbPurge, opts),
  dbInfo: (): Promise<DbInfo> => ipcRenderer.invoke(IPC.dbInfo),

  setupStatus: (): Promise<SetupStatus> => ipcRenderer.invoke(IPC.setupStatus),
  setupInstall: (): Promise<void> => ipcRenderer.invoke(IPC.setupInstall),
  setupUpdateYtDlp: (): Promise<{ version: string | null }> => ipcRenderer.invoke(IPC.setupUpdateYtDlp),
  onSetupProgress: (cb: (e: SetupProgressEvent) => void): (() => void) => {
    const listener = (_: unknown, e: SetupProgressEvent) => cb(e)
    ipcRenderer.on(IPC.setupProgress, listener)
    return () => ipcRenderer.removeListener(IPC.setupProgress, listener)
  },

  shellOpenExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.shellOpenExternal, url),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.getAppVersion),
  windowMinimize: (): Promise<void> => ipcRenderer.invoke(IPC.windowMinimize),
  windowToggleMaximize: (): Promise<void> => ipcRenderer.invoke(IPC.windowToggleMaximize),
  windowClose: (): Promise<void> => ipcRenderer.invoke(IPC.windowClose),
  windowIsMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC.windowIsMaximized),
  onWindowMaximizedChanged: (cb: (maximized: boolean) => void): (() => void) => {
    const listener = (_: unknown, maximized: boolean) => cb(maximized)
    ipcRenderer.on(IPC.windowMaximizedChanged, listener)
    return () => ipcRenderer.removeListener(IPC.windowMaximizedChanged, listener)
  }
}

export type PreloadApi = typeof api

contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
