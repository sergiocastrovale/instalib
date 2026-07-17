import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoDto } from '@shared/types'

let usePlayerModule: typeof import('@/composables/usePlayer')
let useQueueModule: typeof import('@/composables/useQueue')

function makeVideo(overrides: Partial<VideoDto> = {}): VideoDto {
  return {
    id: overrides.id ?? 'v1',
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: 'author',
    caption: null,
    savedAt: 0,
    durationSec: 100,
    filePath: null,
    thumbPath: null,
    status: 'downloaded',
    error: null,
    positionSec: 0,
    speed: 1,
    watched: false,
    favorite: false,
    notes: '',
    lastPlayedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

function makeVideoEl(): HTMLVideoElement {
  const el = document.createElement('video') as HTMLVideoElement
  el.play = vi.fn(() => Promise.resolve())
  el.pause = vi.fn()
  Object.defineProperty(el, 'duration', { value: 100, configurable: true, writable: true })
  return el
}

beforeEach(async () => {
  vi.resetModules()
  const pinia = await import('pinia')
  pinia.setActivePinia(pinia.createPinia())
  usePlayerModule = await import('@/composables/usePlayer')
  useQueueModule = await import('@/composables/useQueue')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('setSpeed', () => {
  it('clamps to [0.25, 2] and rounds to the nearest 0.05', () => {
    const player = usePlayerModule.usePlayer()
    player.setSpeed(5)
    expect(player.state.speed).toBe(2)
    player.setSpeed(0)
    expect(player.state.speed).toBe(0.25)
    player.setSpeed(1.23)
    expect(player.state.speed).toBe(1.25)
  })
})

describe('setVolume', () => {
  it('clamps to [0, 1]', () => {
    const player = usePlayerModule.usePlayer()
    player.setVolume(5)
    expect(player.state.volume).toBe(1)
    player.setVolume(-5)
    expect(player.state.volume).toBe(0)
  })

  it('unmutes when set above 0 while muted', () => {
    const player = usePlayerModule.usePlayer()
    player.setMuted(true)
    player.setVolume(0.5)
    expect(player.state.muted).toBe(false)
  })

  it('does not unmute when clamped to 0', () => {
    const player = usePlayerModule.usePlayer()
    player.setMuted(true)
    player.setVolume(-1)
    expect(player.state.muted).toBe(true)
  })
})

describe('loop A/B', () => {
  it('jumps playback back to loopA once currentTime reaches loopB', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)

    el.currentTime = 5
    player.onTimeUpdate()
    player.setLoopA()

    el.currentTime = 15
    player.onTimeUpdate()
    player.setLoopB()

    el.currentTime = 15
    player.onTimeUpdate()

    expect(el.currentTime).toBe(5)
  })
})

describe('onLoadedMetadata resume', () => {
  it('seeks to positionSec when >5s and <95% through', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({ positionSec: 30 })

    player.onLoadedMetadata()

    expect(el.currentTime).toBe(30)
    expect(player.state.duration).toBe(100)
  })

  it('does not seek when positionSec <= 5', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({ positionSec: 3 })

    player.onLoadedMetadata()

    expect(el.currentTime).toBe(0)
  })

  it('does not seek when >= 95% through (treated as finished)', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({ positionSec: 96 })

    player.onLoadedMetadata()

    expect(el.currentTime).toBe(0)
  })
})

describe('onEnded', () => {
  it('advances to the next queued video when autoplay is on', async () => {
    const queue = useQueueModule.useQueue()
    queue.setQueue('all', ['v1', 'v2'], 'v1')
    queue.autoplay.value = true

    const nextVideo = makeVideo({ id: 'v2' })
    vi.mocked(window.api.videosGet).mockResolvedValue(nextVideo)
    vi.mocked(window.api.playerResolve).mockResolvedValue({ source: 'embed', url: 'https://embed' })

    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({ id: 'v1' })

    await player.onEnded()

    expect(window.api.videosPatch).toHaveBeenCalledWith('v1', { watched: true })
    expect(player.state.video?.id).toBe('v2')
  })

  it('stops playback when autoplay is off or there is no next video', async () => {
    const queue = useQueueModule.useQueue()
    queue.setQueue('all', ['v1'], 'v1')
    queue.autoplay.value = true

    const player = usePlayerModule.usePlayer()
    player.state.video = makeVideo({ id: 'v1' })
    player.state.playing = true

    await player.onEnded()

    expect(player.state.playing).toBe(false)
    expect(player.state.video?.id).toBe('v1')
  })
})

describe('onVideoError (web source)', () => {
  it('forces exactly one re-resolve, ignoring subsequent errors until the next load', async () => {
    vi.mocked(window.api.playerResolve).mockResolvedValue({ source: 'web', url: 'https://cdn/video.mp4' })

    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({ id: 'v1' })
    player.state.source = 'web'

    await player.onVideoError()
    expect(window.api.playerResolve).toHaveBeenCalledTimes(1)

    await player.onVideoError()
    expect(window.api.playerResolve).toHaveBeenCalledTimes(1)
  })

  it('does nothing for non-web sources', async () => {
    const player = usePlayerModule.usePlayer()
    player.state.video = makeVideo({ id: 'v1' })
    player.state.source = 'local'

    await player.onVideoError()

    expect(window.api.playerResolve).not.toHaveBeenCalled()
  })
})

describe('progress persistence timer', () => {
  it('persists positionSec via window.api on the 5s interval while playing', () => {
    vi.useFakeTimers()
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({ id: 'v1' })
    el.currentTime = 42
    player.onTimeUpdate()

    player.onPlay()
    vi.advanceTimersByTime(5000)

    expect(window.api.videosPatch).toHaveBeenCalledWith('v1', { positionSec: 42 })
  })

  it('stops persisting after onPause', () => {
    vi.useFakeTimers()
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({ id: 'v1' })

    player.onPlay()
    player.onPause()
    vi.mocked(window.api.videosPatch).mockClear()
    vi.advanceTimersByTime(10000)

    expect(window.api.videosPatch).not.toHaveBeenCalled()
  })
})
