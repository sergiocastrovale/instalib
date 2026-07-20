import { computed, nextTick, reactive, shallowRef } from 'vue'
import type { VideoDto, VideoPatch, VideoSection, PlaybackSourceKind } from '@shared/types'
import { rampRate } from '../lib/sections'
import { useQueue } from './useQueue'
import { useLibraryStore } from '../stores/library'
import { router } from '../router'

interface PlayerState {
  video: VideoDto | null
  playing: boolean
  currentTime: number
  duration: number
  buffered: number
  muted: boolean
  volume: number
  speed: number
  pendingStart: number | null
  activeSectionId: string | null
  repCount: number
  countdownSec: number | null
  audioOnly: boolean
  dockEl: HTMLElement | null
  source: PlaybackSourceKind | null
  sourceError: string | null
  resolving: boolean
  focusMode: boolean
}

const state = reactive<PlayerState>({
  video: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  muted: false,
  volume: 1,
  speed: 1,
  pendingStart: null,
  activeSectionId: null,
  repCount: 0,
  countdownSec: null,
  audioOnly: false,
  dockEl: null,
  source: null,
  sourceError: null,
  resolving: false,
  focusMode: false
})

const videoEl = shallowRef<HTMLVideoElement | null>(null)
let progressTimer: ReturnType<typeof setInterval> | null = null
let countInTimer: ReturnType<typeof setInterval> | null = null
let hasRetriedResolve = false
// section the user explicitly stopped looping - suppresses auto-reentry until
// playback actually leaves its range, so onTimeUpdate doesn't immediately
// reactivate it on the very next tick
let dismissedSectionId: string | null = null

function patchVideo(patch: VideoPatch): Promise<void> {
  if (!state.video) return Promise.resolve()
  Object.assign(state.video, patch)
  useLibraryStore().patchVideoLocal(state.video.id, patch)
  return window.api.videosPatch(state.video.id, patch).then(
    () => {},
    () => {}
  )
}

// playback rate without persisting - the section ramp drives this constantly and
// must not overwrite the video's own saved speed
function applyRate(v: number): void {
  state.speed = v
  if (videoEl.value) videoEl.value.playbackRate = v
}

function clearCountIn(): void {
  if (countInTimer) clearInterval(countInTimer)
  countInTimer = null
  state.countdownSec = null
}

function persistProgress(): void {
  if (!state.video) return
  patchVideo({ positionSec: state.currentTime })
}

function startProgressTimer(): void {
  stopProgressTimer()
  progressTimer = setInterval(persistProgress, 5000)
}

function stopProgressTimer(): void {
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = null
}

export function usePlayer() {
  const queue = useQueue()

  function bindVideoEl(el: HTMLVideoElement | null): void {
    videoEl.value = el
  }

  async function applySource(force = false): Promise<void> {
    if (!state.video) return
    const videoId = state.video.id
    state.resolving = true
    state.sourceError = null
    const result = await window.api.playerResolve(videoId, force)
    if (state.video?.id !== videoId) return
    state.resolving = false
    state.source = result.source
    state.sourceError = result.error ?? null

    if (result.source === 'embed') return

    await nextTick()
    if (state.video?.id !== videoId) return
    const el = videoEl.value
    if (!el) return
    el.src = result.url
    el.playbackRate = state.speed
    el.volume = state.volume
    el.muted = state.muted
  }

  async function loadVideo(video: VideoDto, opts: { autoplay?: boolean } = {}): Promise<void> {
    const isSameVideo = state.video?.id === video.id
    state.video = video
    state.pendingStart = null
    state.activeSectionId = null
    state.repCount = 0
    clearCountIn()
    dismissedSectionId = null
    state.speed = video.speed || 1
    hasRetriedResolve = false
    queue.setIndexById(video.id)

    if (!isSameVideo) {
      await applySource()
    }

    await nextTick()
    const el = videoEl.value
    if (!el || state.source === 'embed') return

    if (opts.autoplay !== false) {
      try {
        await el.play()
      } catch {
        // autoplay blocked - user can hit play manually
      }
    }
  }

  function play(): void {
    videoEl.value?.play().catch(() => {})
  }

  function pause(): void {
    videoEl.value?.pause()
  }

  function toggle(): void {
    if (!videoEl.value) return
    if (videoEl.value.paused) play()
    else pause()
  }

  function seek(sec: number): void {
    if (!videoEl.value) return
    const clamped = Math.max(0, Math.min(sec, state.duration || sec))
    videoEl.value.currentTime = clamped
    // explicit seek: loop the section landed in, or play normally if outside all of them
    dismissedSectionId = null
    const target = sections.value.find((s) => clamped >= s.start && clamped < s.end)
    if (target) {
      if (target.id !== state.activeSectionId) enterSection(target)
    } else if (state.activeSectionId !== null) {
      exitSection()
    }
  }

  function seekBy(deltaSec: number): void {
    seek(state.currentTime + deltaSec)
  }

  function setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v))
    state.volume = clamped
    if (videoEl.value) videoEl.value.volume = clamped
    if (clamped > 0 && state.muted) setMuted(false)
  }

  function setMuted(m: boolean): void {
    state.muted = m
    if (videoEl.value) videoEl.value.muted = m
  }

  function toggleMuted(): void {
    setMuted(!state.muted)
  }

  function setSpeed(v: number): void {
    const clamped = Math.max(0.25, Math.min(2, Math.round(v * 20) / 20))
    applyRate(clamped)
    if (state.video) {
      patchVideo({ speed: clamped })
    }
  }

  const sections = computed<VideoSection[]>(() => state.video?.sections ?? [])

  function enterSection(sec: VideoSection): void {
    clearCountIn()
    state.activeSectionId = sec.id
    state.repCount = 0
    if (sec.ramp) applyRate(rampRate(sec.ramp, 0))
  }

  function exitSection(): void {
    clearCountIn()
    state.activeSectionId = null
    state.repCount = 0
    applyRate(state.video?.speed || 1)
  }

  // pause for the section's count-in, then restart it from the top
  function startCountIn(sec: VideoSection): void {
    clearCountIn()
    pause()
    state.countdownSec = sec.countInSec ?? 0
    countInTimer = setInterval(() => {
      const remaining = (state.countdownSec ?? 1) - 1
      if (remaining > 0) {
        state.countdownSec = remaining
        return
      }
      clearCountIn()
      if (videoEl.value) videoEl.value.currentTime = sec.start
      play()
    }, 1000)
  }

  function restartSection(sec: VideoSection): void {
    state.repCount++
    if (sec.ramp) applyRate(rampRate(sec.ramp, state.repCount))
    if (sec.countInSec) startCountIn(sec)
    else if (videoEl.value) videoEl.value.currentTime = sec.start
  }

  function startSection(): void {
    state.pendingStart = state.currentTime
  }

  function endSection(): VideoSection | null {
    if (state.pendingStart == null || sections.value.length >= 8) {
      state.pendingStart = null
      return null
    }
    const start = Math.min(state.pendingStart, state.currentTime)
    const end = Math.max(state.pendingStart, state.currentTime)
    state.pendingStart = null
    if (end - start < 0.5) return null
    return {
      id: crypto.randomUUID(),
      start,
      end,
      name: `Section ${sections.value.length + 1}`,
      notes: ''
    }
  }

  async function addSection(): Promise<void> {
    const sec = endSection()
    if (!sec) return
    await patchVideo({ sections: [...sections.value, sec] })
    state.activeSectionId = sec.id
  }

  async function updateSection(
    id: string,
    patch: Partial<Omit<VideoSection, 'id'>>
  ): Promise<void> {
    const updated = sections.value.map((s) =>
      s.id === id ? ({ ...s, ...patch } as VideoSection) : s
    )
    await patchVideo({ sections: updated })
  }

  async function deleteSection(id: string): Promise<void> {
    const updated = sections.value.filter((s) => s.id !== id)
    if (state.activeSectionId === id) exitSection()
    if (dismissedSectionId === id) dismissedSectionId = null
    await patchVideo({ sections: updated })
  }

  function playSection(sec: VideoSection): void {
    seek(sec.start)
    if (sec.countInSec) startCountIn(sec)
    else play()
  }

  function stopLooping(): void {
    dismissedSectionId = state.activeSectionId
    exitSection()
  }

  function toggleAudioOnly(): void {
    state.audioOnly = !state.audioOnly
  }

  function toggleFocusMode(): void {
    state.focusMode = !state.focusMode
  }

  async function markWatched(): Promise<void> {
    if (!state.video) return
    await patchVideo({ watched: true })
  }

  async function toggleWatched(): Promise<void> {
    if (!state.video) return
    await patchVideo({ watched: !state.video.watched })
  }

  async function toggleFavorite(): Promise<void> {
    if (!state.video) return
    await patchVideo({ favorite: !state.video.favorite })
  }

  async function saveNotes(notes: string): Promise<void> {
    if (!state.video) return
    await patchVideo({ notes })
  }

  async function playNextInQueue(): Promise<boolean> {
    const nextId = queue.next()
    if (!nextId) return false
    const video = await window.api.videosGet(nextId)
    if (!video) return false
    await loadVideo(video)
    if (queue.listId.value) await router.push(`/watch/${nextId}?list=${queue.listId.value}`)
    return true
  }

  async function playPrevInQueue(): Promise<boolean> {
    const prevId = queue.prev()
    if (!prevId) return false
    const video = await window.api.videosGet(prevId)
    if (!video) return false
    await loadVideo(video)
    if (queue.listId.value) await router.push(`/watch/${prevId}?list=${queue.listId.value}`)
    return true
  }

  function onTimeUpdate(): void {
    const el = videoEl.value
    if (!el) return
    state.currentTime = el.currentTime
    if (state.activeSectionId !== null) {
      const sec = sections.value.find((s) => s.id === state.activeSectionId)
      if (sec && el.currentTime >= sec.end) restartSection(sec)
    } else {
      const entered = sections.value.find((s) => el.currentTime >= s.start && el.currentTime < s.end)
      if (entered && entered.id !== dismissedSectionId) {
        enterSection(entered)
      } else if (!entered) {
        dismissedSectionId = null
      }
    }
    if (el.buffered.length > 0) {
      state.buffered = el.buffered.end(el.buffered.length - 1)
    }
  }

  function onLoadedMetadata(): void {
    const el = videoEl.value
    if (!el || !state.video) return
    state.duration = el.duration
    el.playbackRate = state.speed
    const pos = state.video.positionSec
    if (pos > 5 && pos / (el.duration || 1) < 0.95) {
      el.currentTime = pos
    }
  }

  async function retryResolve(): Promise<void> {
    hasRetriedResolve = false
    await applySource(true)
    if (state.source !== 'embed') play()
  }

  async function onVideoError(): Promise<void> {
    if (state.source !== 'web' || hasRetriedResolve) return
    hasRetriedResolve = true
    const resumeAt = state.currentTime
    await applySource(true)
    if (state.source === 'web' && videoEl.value) {
      videoEl.value.currentTime = resumeAt
      play()
    }
  }

  async function onEnded(): Promise<void> {
    persistProgress()
    stopProgressTimer()
    await markWatched()
    const advanced = queue.autoplay.value ? await playNextInQueue() : false
    if (!advanced) state.playing = false
  }

  function onPlay(): void {
    state.playing = true
    startProgressTimer()
  }

  function onPause(): void {
    state.playing = false
    persistProgress()
    stopProgressTimer()
  }

  return {
    state,
    videoEl,
    bindVideoEl,
    loadVideo,
    play,
    pause,
    toggle,
    seek,
    seekBy,
    setVolume,
    setMuted,
    toggleMuted,
    setSpeed,
    sections,
    startSection,
    endSection,
    addSection,
    updateSection,
    deleteSection,
    playSection,
    stopLooping,
    toggleAudioOnly,
    toggleFocusMode,
    markWatched,
    toggleWatched,
    toggleFavorite,
    saveNotes,
    playNextInQueue,
    playPrevInQueue,
    onTimeUpdate,
    onLoadedMetadata,
    onVideoError,
    retryResolve,
    onEnded,
    onPlay,
    onPause
  }
}
