import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { BrowserOption } from '@shared/types'

function candidatePaths(): { id: string; label: string; path: string }[] {
  const home = homedir()
  const plat = process.platform

  if (plat === 'win32') {
    const local = process.env['LOCALAPPDATA'] ?? join(home, 'AppData', 'Local')
    const roaming = process.env['APPDATA'] ?? join(home, 'AppData', 'Roaming')
    return [
      { id: 'firefox', label: 'Firefox', path: join(roaming, 'Mozilla', 'Firefox', 'Profiles') },
      { id: 'chrome', label: 'Chrome', path: join(local, 'Google', 'Chrome', 'User Data') },
      { id: 'edge', label: 'Edge', path: join(local, 'Microsoft', 'Edge', 'User Data') },
      { id: 'brave', label: 'Brave', path: join(local, 'BraveSoftware', 'Brave-Browser', 'User Data') }
    ]
  }

  if (plat === 'darwin') {
    const support = join(home, 'Library', 'Application Support')
    return [
      { id: 'firefox', label: 'Firefox', path: join(support, 'Firefox', 'Profiles') },
      { id: 'chrome', label: 'Chrome', path: join(support, 'Google', 'Chrome') },
      { id: 'edge', label: 'Edge', path: join(support, 'Microsoft Edge') },
      { id: 'brave', label: 'Brave', path: join(support, 'BraveSoftware', 'Brave-Browser') },
      { id: 'safari', label: 'Safari', path: join(home, 'Library', 'Cookies') }
    ]
  }

  return [
    { id: 'firefox', label: 'Firefox', path: join(home, '.mozilla', 'firefox') },
    { id: 'chrome', label: 'Chrome', path: join(home, '.config', 'google-chrome') },
    { id: 'chromium', label: 'Chromium', path: join(home, '.config', 'chromium') },
    { id: 'brave', label: 'Brave', path: join(home, '.config', 'BraveSoftware', 'Brave-Browser') }
  ]
}

export function detectInstalledBrowsers(): BrowserOption[] {
  const results: BrowserOption[] = []
  for (const c of candidatePaths()) {
    if (!existsSync(c.path)) continue
    const isChromiumOnWindows =
      process.platform === 'win32' && ['chrome', 'edge', 'brave'].includes(c.id)
    results.push({
      id: c.id,
      label: c.label,
      warning: isChromiumOnWindows
        ? 'Chrome 127+ App-Bound Encryption may block cookie extraction on Windows. Firefox is recommended.'
        : undefined
    })
  }
  return results
}
