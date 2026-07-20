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
    sections: [],
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

describe('sections', () => {
  it('endSection captures [min,max] of pendingStart/currentTime and discards spans under 0.5s', async () => {
    const player = usePlayerModule.usePlayer()
    player.state.video = makeVideo()

    player.state.currentTime = 0.2
    player.startSection()
    player.state.currentTime = 0.3
    await player.addSection()
    expect(player.state.video!.sections).toHaveLength(0)

    player.state.currentTime = 15
    player.startSection()
    player.state.currentTime = 5
    await player.addSection()
    expect(player.state.video!.sections).toEqual([
      expect.objectContaining({ start: 5, end: 15, name: 'Section 1', notes: '' })
    ])
    expect(player.state.pendingStart).toBeNull()
  })

  it('endSection is blocked once there are already 8 sections', () => {
    const player = usePlayerModule.usePlayer()
    const existing = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      start: i,
      end: i + 0.5,
      name: `Section ${i + 1}`,
      notes: ''
    }))
    player.state.video = makeVideo({ sections: existing })
    player.state.currentTime = 20
    player.startSection()
    player.state.currentTime = 25

    expect(player.endSection()).toBeNull()
    expect(player.state.pendingStart).toBeNull()
  })

  it('loops playback back to the active section start once currentTime reaches its end', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [{ id: 's1', start: 5, end: 15, name: 'Section 1', notes: '' }]
    })
    player.playSection(player.state.video.sections[0])

    el.currentTime = 15
    player.onTimeUpdate()

    expect(el.currentTime).toBe(5)
  })

  it('stopLooping clears the active section so playback no longer wraps', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [{ id: 's1', start: 5, end: 15, name: 'Section 1', notes: '' }]
    })
    player.playSection(player.state.video.sections[0])
    player.stopLooping()

    el.currentTime = 15
    player.onTimeUpdate()

    expect(el.currentTime).toBe(15)
  })

  it('auto-activates looping once natural playback reaches a section start, with no explicit selection', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [{ id: 's1', start: 5, end: 15, name: 'Section 1', notes: '' }]
    })

    el.currentTime = 4
    player.onTimeUpdate()
    expect(player.state.activeSectionId).toBeNull()

    el.currentTime = 5
    player.onTimeUpdate()
    expect(player.state.activeSectionId).toBe('s1')

    el.currentTime = 15
    player.onTimeUpdate()
    expect(el.currentTime).toBe(5)
  })

  it('seeking outside any section stops looping and plays on normally', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [{ id: 's1', start: 5, end: 15, name: 'Section 1', notes: '' }]
    })
    player.playSection(player.state.video.sections[0])
    expect(player.state.activeSectionId).toBe('s1')

    player.seek(50)
    expect(player.state.activeSectionId).toBeNull()

    el.currentTime = 60
    player.onTimeUpdate()
    expect(el.currentTime).toBe(60)
  })

  it('seeking directly into a different section activates that one instead', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [
        { id: 's1', start: 5, end: 15, name: 'Section 1', notes: '' },
        { id: 's2', start: 30, end: 40, name: 'Section 2', notes: '' }
      ]
    })
    player.playSection(player.state.video.sections[0])

    player.seek(32)
    expect(player.state.activeSectionId).toBe('s2')
  })

  it('stopLooping suppresses reactivation while still inside the section, until playback actually leaves it', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [{ id: 's1', start: 5, end: 15, name: 'Section 1', notes: '' }]
    })
    player.playSection(player.state.video.sections[0])
    player.stopLooping()

    // still inside [5,15) - must NOT reactivate on the next tick
    el.currentTime = 10
    player.onTimeUpdate()
    expect(player.state.activeSectionId).toBeNull()

    // leaves the range entirely
    el.currentTime = 20
    player.onTimeUpdate()
    expect(player.state.activeSectionId).toBeNull()

    // re-entering later (e.g. looped back around) activates it again
    el.currentTime = 5
    player.onTimeUpdate()
    expect(player.state.activeSectionId).toBe('s1')
  })
})

describe('section practice options', () => {
  it('applies the ramp start rate on entry and steps it on every wrap', () => {
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [
        {
          id: 's1',
          start: 5,
          end: 15,
          name: 'Section 1',
          notes: '',
          ramp: { startAt: 0.5, step: 0.05, endAt: 0.6, repsPerStep: 1 }
        }
      ]
    })
    player.playSection(player.state.video.sections[0])
    expect(player.state.speed).toBeCloseTo(0.5)
    expect(player.state.repCount).toBe(0)

    el.currentTime = 15
    player.onTimeUpdate()
    expect(el.currentTime).toBe(5)
    expect(player.state.repCount).toBe(1)
    expect(player.state.speed).toBeCloseTo(0.55)

    el.currentTime = 15
    player.onTimeUpdate()
    el.currentTime = 15
    player.onTimeUpdate()
    expect(player.state.speed).toBeCloseTo(0.6)
  })

  it('does not persist ramp rates and restores the video speed when looping stops', () => {
    const patch = vi.fn(() => Promise.resolve(null))
    window.api.videosPatch = patch as never
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      speed: 1.25,
      sections: [
        {
          id: 's1',
          start: 5,
          end: 15,
          name: 'Section 1',
          notes: '',
          ramp: { startAt: 0.5, step: 0.05, endAt: 1, repsPerStep: 1 }
        }
      ]
    })
    player.playSection(player.state.video.sections[0])
    el.currentTime = 15
    player.onTimeUpdate()

    expect(patch).not.toHaveBeenCalled()
    expect(player.state.video!.speed).toBe(1.25)

    player.stopLooping()
    expect(player.state.speed).toBe(1.25)
    expect(el.playbackRate).toBe(1.25)
  })

  it('pauses for the count-in on each wrap, then resumes from the section start', () => {
    vi.useFakeTimers()
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [{ id: 's1', start: 5, end: 15, name: 'Section 1', notes: '', countInSec: 3 }]
    })
    player.playSection(player.state.video.sections[0])
    expect(player.state.countdownSec).toBe(3)
    expect(el.pause).toHaveBeenCalled()

    vi.advanceTimersByTime(2000)
    expect(player.state.countdownSec).toBe(1)
    expect(el.play).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(player.state.countdownSec).toBeNull()
    expect(el.currentTime).toBe(5)
    expect(el.play).toHaveBeenCalled()

    el.currentTime = 15
    player.onTimeUpdate()
    expect(player.state.countdownSec).toBe(3)
    // still parked at the end until the count-in elapses
    expect(el.currentTime).toBe(15)
    vi.advanceTimersByTime(3000)
    expect(el.currentTime).toBe(5)
  })

  it('cancels a running count-in when the loop is stopped', () => {
    vi.useFakeTimers()
    const player = usePlayerModule.usePlayer()
    const el = makeVideoEl()
    player.bindVideoEl(el)
    player.state.video = makeVideo({
      sections: [{ id: 's1', start: 5, end: 15, name: 'Section 1', notes: '', countInSec: 3 }]
    })
    player.playSection(player.state.video.sections[0])
    player.stopLooping()

    expect(player.state.countdownSec).toBeNull()
    vi.advanceTimersByTime(5000)
    expect(el.play).not.toHaveBeenCalled()
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
