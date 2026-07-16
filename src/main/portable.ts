import { dirname, join } from 'node:path'

/**
 * Windows portable builds set PORTABLE_EXECUTABLE_DIR; Linux AppImage sets
 * APPIMAGE to the mounted image's own path. Both point at a location next to
 * the single-file executable, which is where a "no install" build must keep
 * its data instead of the OS profile dir. macOS has no such env var, so a
 * bundle run from outside /Applications (e.g. extracted from the portable
 * .zip target, or launched straight off a USB stick) is treated as portable too.
 */
export function resolvePortableDataDir(): string | null {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return join(process.env.PORTABLE_EXECUTABLE_DIR, 'Instalib-Data')
  }
  if (process.env.APPIMAGE) {
    return join(dirname(process.env.APPIMAGE), 'Instalib-Data')
  }
  if (process.platform === 'darwin') {
    const match = /^(.*\.app)\/Contents\/MacOS\//.exec(process.execPath)
    if (match && !match[1].startsWith('/Applications/')) {
      return join(dirname(match[1]), 'Instalib-Data')
    }
  }
  return null
}
