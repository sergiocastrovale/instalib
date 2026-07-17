import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { Settings, VideoListQuery, VideoPatch, SyncEvent, SetupProgressEvent, PurgeOptions } from '@shared/types'
import { listVideos, getVideo, patchVideo, resetToPending } from '../db/videos'
import { listCollections, patchCollection, getDownloadedCounts } from '../db/collections'
import { getSettings, setSettings } from '../db/settings'
import { getDbInfo } from '../db'
import { importFromPath } from '../services/importer'
import { resolvePlayback } from '../services/resolver'
import { startSync, requestStop, getSyncStatus, setSyncEmitter, isSyncRunning } from '../services/downloader'
import { requestCoverStop, getCoverStatus, setCoverEmitter } from '../services/covers'
import { purgeDatabase } from '../services/purge'
import { deleteCollection } from '../services/collections'
import {
  ensureBinaries,
  binariesReady,
  getYtDlpVersion,
  getFfmpegVersion,
  updateYtDlp
} from '../services/binaries'
import { detectInstalledBrowsers } from '../services/cookies'
import { resolvePortableDataDir } from '../portable'

export function registerAllIpc(mainWindow: BrowserWindow): void {
  setSyncEmitter((e: SyncEvent) => {
    mainWindow.webContents.send(IPC.syncEvent, e)
  })
  setCoverEmitter((e: SyncEvent) => {
    mainWindow.webContents.send(IPC.coverFetchEvent, e)
  })

  mainWindow.on('maximize', () => mainWindow.webContents.send(IPC.windowMaximizedChanged, true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send(IPC.windowMaximizedChanged, false))

  ipcMain.handle(IPC.videosList, (_e, query: VideoListQuery) => listVideos(query ?? {}))
  ipcMain.handle(IPC.videosGet, (_e, id: string) => getVideo(id))
  ipcMain.handle(IPC.videosPatch, (_e, id: string, patch: VideoPatch) => patchVideo(id, patch))
  ipcMain.handle(IPC.videosRetry, (_e, id: string) => resetToPending(id))

  ipcMain.handle(IPC.collectionsList, () => listCollections())
  ipcMain.handle(IPC.collectionsDelete, (_e, id: string) => deleteCollection(id))
  ipcMain.handle(IPC.collectionsPatch, (_e, id: string, patch: { syncEnabled?: boolean }) =>
    patchCollection(id, patch)
  )
  ipcMain.handle(IPC.collectionsDownloadedCounts, () => getDownloadedCounts())

  ipcMain.handle(IPC.importZip, (_e, filePath: string) => importFromPath(filePath))

  ipcMain.handle(IPC.playerResolve, (_e, videoId: string, force?: boolean) =>
    resolvePlayback(videoId, force ?? false)
  )

  ipcMain.handle(IPC.syncStart, async (_e, opts?: { collectionId?: string }) => {
    if (!isSyncRunning()) startSync(opts?.collectionId)
  })
  ipcMain.handle(IPC.syncStop, () => requestStop())
  ipcMain.handle(IPC.syncStatus, () => getSyncStatus())

  ipcMain.handle(IPC.coverFetchStop, () => requestCoverStop())
  ipcMain.handle(IPC.coverFetchStatus, () => getCoverStatus())

  ipcMain.handle(IPC.settingsGet, () => getSettings())
  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<Settings>) => {
    if (patch.theme) nativeTheme.themeSource = patch.theme
    return setSettings(patch)
  })
  ipcMain.handle(IPC.settingsPickSyncFolder, async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
  ipcMain.handle(IPC.settingsDetectBrowsers, () => detectInstalledBrowsers())
  ipcMain.handle(IPC.settingsDataLocation, () => ({
    path: app.getPath('userData'),
    portable: resolvePortableDataDir() !== null
  }))

  ipcMain.handle(IPC.dbPurge, (_e, opts: PurgeOptions) => purgeDatabase(opts))
  ipcMain.handle(IPC.dbInfo, () => getDbInfo())

  ipcMain.handle(IPC.setupStatus, async () => {
    const ready = binariesReady()
    const [ytDlpVersion, ffmpegVersion] = await Promise.all([getYtDlpVersion(), getFfmpegVersion()])
    return { ytDlp: ready.ytDlp, ffmpeg: ready.ffmpeg, ytDlpVersion, ffmpegVersion }
  })
  ipcMain.handle(IPC.setupInstall, async () => {
    await ensureBinaries((e: SetupProgressEvent) => {
      mainWindow.webContents.send(IPC.setupProgress, e)
    })
    const version = await getYtDlpVersion()
    setSettings({ setupComplete: true, ytDlpVersion: version ?? undefined })
  })
  ipcMain.handle(IPC.setupUpdateYtDlp, async () => {
    await updateYtDlp()
    const version = await getYtDlpVersion()
    setSettings({ ytDlpVersion: version ?? undefined })
    return { version }
  })

  ipcMain.handle(IPC.shellOpenExternal, (_e, url: string) => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return
    return shell.openExternal(url)
  })

  ipcMain.handle(IPC.getAppVersion, () => app.getVersion())
  ipcMain.handle(IPC.windowMinimize, () => mainWindow.minimize())
  ipcMain.handle(IPC.windowToggleMaximize, () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle(IPC.windowClose, () => mainWindow.close())
  ipcMain.handle(IPC.windowIsMaximized, () => mainWindow.isMaximized())
}
