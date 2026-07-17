import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { vi } from 'vitest'

const paths = new Map<string, string>()

function ensureDefault(name: string): string {
  if (!paths.has(name)) {
    paths.set(name, mkdtempSync(join(tmpdir(), `instalib-${name}-`)))
  }
  return paths.get(name)!
}

export function __setUserDataDir(dir: string): void {
  paths.set('userData', dir)
}

export function __resetPaths(): void {
  paths.clear()
}

export const app = {
  getPath: vi.fn((name: string) => ensureDefault(name)),
  setPath: vi.fn((name: string, path: string) => {
    paths.set(name, path)
  }),
  getVersion: vi.fn(() => '0.1.0'),
  on: vi.fn(),
  whenReady: vi.fn(() => Promise.resolve()),
  quit: vi.fn()
}

type ProtocolHandler = (request: Request) => Promise<Response> | Response
const protocolHandlers = new Map<string, ProtocolHandler>()

export function __getProtocolHandler(scheme: string): ProtocolHandler | undefined {
  return protocolHandlers.get(scheme)
}

export function __resetProtocolHandlers(): void {
  protocolHandlers.clear()
}

export const protocol = {
  registerSchemesAsPrivileged: vi.fn(),
  handle: vi.fn((scheme: string, handler: ProtocolHandler) => {
    protocolHandlers.set(scheme, handler)
  })
}

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}

export const ipcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}

export const nativeTheme = {
  themeSource: 'dark',
  shouldUseDarkColors: true
}

export const dialog = {
  showOpenDialog: vi.fn(() => Promise.resolve({ canceled: true, filePaths: [] as string[] }))
}

export const shell = {
  openExternal: vi.fn(() => Promise.resolve())
}

export class BrowserWindow {
  webContents = { send: vi.fn() }
  static getAllWindows = vi.fn(() => [])
  on = vi.fn()
  minimize = vi.fn()
  maximize = vi.fn()
  unmaximize = vi.fn()
  close = vi.fn()
  isMaximized = vi.fn(() => false)
}

export const contextBridge = {
  exposeInMainWorld: vi.fn()
}

export const webUtils = {
  getPathForFile: vi.fn((f: File) => (f as unknown as { path?: string }).path ?? '')
}
