import { mkdirSync } from 'node:fs'
import { app, BrowserWindow, nativeTheme } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createWindow } from './window'
import { registerMediaSchemePrivileges, registerMediaProtocol } from './protocol'
import { installCdnHeaderOverrides } from './cdn-headers'
import { registerAllIpc } from './ipc/index'
import { getDb } from './db/index'
import { getSettings } from './db/settings'
import { listVideosNeedingCover, resetStaleDownloads } from './db/videos'
import { startCoverFetch, isCoverFetchRunning } from './services/covers'
import { requestStop } from './services/downloader'
import { resolvePortableDataDir } from './portable'

const portableDataDir = resolvePortableDataDir()
if (portableDataDir) {
  mkdirSync(portableDataDir, { recursive: true })
  app.setPath('userData', portableDataDir)
}

registerMediaSchemePrivileges()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.instalib.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  getDb()
  resetStaleDownloads()
  registerMediaProtocol()
  installCdnHeaderOverrides()
  nativeTheme.themeSource = getSettings().theme

  const mainWindow = createWindow()
  registerAllIpc(mainWindow)

  if (!isCoverFetchRunning() && listVideosNeedingCover().length > 0) startCoverFetch()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createWindow()
      registerAllIpc(w)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  requestStop()
})

if (is.dev) {
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (_event, url) => {
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        _event.preventDefault()
      }
    })
  })
}
