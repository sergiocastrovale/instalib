import { join } from 'node:path'
import { BrowserWindow, shell, screen } from 'electron'
import { is } from '@electron-toolkit/utils'

export function createWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const screenHeight = primaryDisplay.workArea.height
  const height = Math.floor(screenHeight * 0.8)
  const width = Math.floor(height * 1.6)

  const window = new BrowserWindow({
    width,
    height,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    resizable: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
