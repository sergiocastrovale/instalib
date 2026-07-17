import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join, dirname } from 'node:path'
import { resolvePortableDataDir } from '../../../src/main/portable'

const originalPlatform = process.platform
const originalExecPath = process.execPath

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })
}

function setExecPath(path: string): void {
  Object.defineProperty(process, 'execPath', { value: path, configurable: true })
}

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
  setPlatform(originalPlatform)
  setExecPath(originalExecPath)
})

describe('resolvePortableDataDir', () => {
  it('honors PORTABLE_EXECUTABLE_DIR (Windows portable build)', () => {
    vi.stubEnv('PORTABLE_EXECUTABLE_DIR', '/mnt/usb/instalib')
    expect(resolvePortableDataDir()).toBe(join('/mnt/usb/instalib', 'Instalib-Data'))
  })

  it('honors APPIMAGE (Linux AppImage)', () => {
    vi.stubEnv('APPIMAGE', '/home/user/Downloads/Instalib.AppImage')
    expect(resolvePortableDataDir()).toBe(
      join(dirname('/home/user/Downloads/Instalib.AppImage'), 'Instalib-Data')
    )
  })

  it('treats a macOS bundle run outside /Applications as portable', () => {
    setPlatform('darwin')
    setExecPath('/Users/me/Downloads/Instalib.app/Contents/MacOS/Instalib')
    expect(resolvePortableDataDir()).toBe(join('/Users/me/Downloads', 'Instalib-Data'))
  })

  it('treats a macOS bundle run from /Applications as installed, not portable', () => {
    setPlatform('darwin')
    setExecPath('/Applications/Instalib.app/Contents/MacOS/Instalib')
    expect(resolvePortableDataDir()).toBeNull()
  })

  it('returns null with no env vars set and non-darwin platform', () => {
    setPlatform('linux')
    expect(resolvePortableDataDir()).toBeNull()
  })
})
