import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let routerModule: typeof import('@/router')

beforeEach(async () => {
  vi.resetModules()
  window.location.hash = ''
  routerModule = await import('@/router')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('router beforeEach guard', () => {
  it('redirects to /setup when binaries are missing', async () => {
    vi.mocked(window.api.setupStatus).mockResolvedValue({
      ytDlp: false,
      ffmpeg: true,
      ytDlpVersion: null,
      ffmpegVersion: '6.0'
    })

    await routerModule.router.push('/')

    expect(routerModule.router.currentRoute.value.name).toBe('setup')
  })

  it('allows navigation through when both binaries are ready', async () => {
    vi.mocked(window.api.setupStatus).mockResolvedValue({
      ytDlp: true,
      ffmpeg: true,
      ytDlpVersion: '2024.01.01',
      ffmpegVersion: '6.0'
    })

    await routerModule.router.push('/')

    expect(routerModule.router.currentRoute.value.name).toBe('library')
  })

  it('allows navigation through when the setupStatus call throws', async () => {
    vi.mocked(window.api.setupStatus).mockRejectedValue(new Error('ipc down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await routerModule.router.push('/')

    expect(routerModule.router.currentRoute.value.name).toBe('library')
    expect(consoleError).toHaveBeenCalled()
  })

  it('short-circuits for the setup route itself, without calling setupStatus', async () => {
    await routerModule.router.push('/setup')

    expect(routerModule.router.currentRoute.value.name).toBe('setup')
    expect(window.api.setupStatus).not.toHaveBeenCalled()
  })
})
