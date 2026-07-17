import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { _electron, test as base, type ElectronApplication, type Page } from '@playwright/test'
// electron's package main export is the path to its binary when required
// from plain Node (as opposed to running *as* Electron).
import electronPath from 'electron'

const repoRoot = join(__dirname, '..', '..', '..')
const mainEntry = join(repoRoot, 'out', 'main', 'index.js')

export interface LaunchOptions {
  /** Copy the stub yt-dlp/ffmpeg binaries into place so the setup gate passes. Default true. */
  withStubs?: boolean
  /** Seed the DB with fixture videos/collections before launch. Default false. */
  seed?: boolean
  /** Reuse an existing data dir (e.g. to test relaunch behavior) instead of creating a fresh one. */
  dataDir?: string
}

export interface LaunchResult {
  app: ElectronApplication
  page: Page
  dataDir: string
}

function seedBinDir(dataDir: string): void {
  const binDir = join(dataDir, 'Instalib-Data', 'bin')
  mkdirSync(binDir, { recursive: true })
  for (const name of ['yt-dlp', 'ffmpeg']) {
    const dest = join(binDir, name)
    copyFileSync(join(__dirname, '..', 'stubs', name), dest)
    chmodSync(dest, 0o755)
  }
}

function seedDb(dataDir: string): void {
  execFileSync(electronPath as unknown as string, [join(__dirname, 'seed.mjs'), dataDir], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit'
  })
}

async function launchAt(dataDir: string, opts: LaunchOptions, isFreshDir: boolean): Promise<LaunchResult> {
  const { withStubs = true, seed = false } = opts

  if (isFreshDir) {
    if (withStubs) seedBinDir(dataDir)
    if (seed) seedDb(dataDir)
  }

  const app = await _electron.launch({
    args: [mainEntry],
    env: { ...process.env, PORTABLE_EXECUTABLE_DIR: dataDir }
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')

  return { app, page, dataDir }
}

export const test = base.extend<{ launch: (opts?: LaunchOptions) => Promise<LaunchResult> }>({
  // eslint-disable-next-line no-empty-pattern
  launch: async ({}, use) => {
    const launched: LaunchResult[] = []
    const ownedDirs = new Set<string>()

    await use(async (opts) => {
      // Track (and create, if needed) the data dir up front so a failure
      // partway through launchApp (bad seed, launch timeout, ...) still gets
      // its temp dir cleaned up instead of leaking it.
      const isFreshDir = !opts?.dataDir
      const dataDir = opts?.dataDir ?? mkdtempSync(join(tmpdir(), 'instalib-e2e-'))
      if (isFreshDir) ownedDirs.add(dataDir)

      const result = await launchAt(dataDir, opts ?? {}, isFreshDir)
      launched.push(result)
      return result
    })

    for (const result of launched) {
      await result.app.close().catch(() => {})
    }
    for (const dir of ownedDirs) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
})

export { expect } from '@playwright/test'
