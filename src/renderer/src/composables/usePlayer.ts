import { nextTick, reactive, shallowRef } from 'vue'
import type { VideoDto, PlaybackSourceKind } from '@shared/types'
import { useQueue } from './useQueue'
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
  loopA: number | null
  loopB: number | null
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
  loopA: null,
  loopB: null,
  audioOnly: false,
  dockEl: null,
  source: null,
  sourceError: null,
  resolving: false,
  focusMode: false
})

const videoEl = shallowRef<HTMLVideoElement | null>(null)
let progressTimer: ReturnType<typeof setInterval> | null = null
let hasRetriedResolve = false

function persistProgress(): void {
  if (!state.video) return
  window.api.videosPatch(state.video.id, { positionSec: state.currentTime }).catch(() => {})
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
    state.loopA = null
    state.loopB = null
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
        // autoplay blocked — user can hit play manually
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
    videoEl.value.currentTime = Math.max(0, Math.min(sec, state.duration || sec))
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
    state.speed = clamped
    if (videoEl.value) videoEl.value.playbackRate = clamped
    if (state.video) {
      window.api.videosPatch(state.video.id, { speed: clamped }).catch(() => {})
    }
  }

  function setLoopA(): void {
    state.loopA = state.currentTime
    if (state.loopB !== null && state.loopB <= state.loopA) state.loopB = null
  }

  function setLoopB(): void {
    state.loopB = state.currentTime
    if (state.loopA !== null && state.loopA >= state.loopB) state.loopA = null
  }

  function clearLoop(): void {
    state.loopA = null
    state.loopB = null
  }

  function toggleAudioOnly(): void {
    state.audioOnly = !state.audioOnly
  }

  function toggleFocusMode(): void {
    state.focusMode = !state.focusMode
  }

  async function markWatched(): Promise<void> {
    if (!state.video) return
    state.video.watched = true
    await window.api.videosPatch(state.video.id, { watched: true }).catch(() => {})
  }

  async function toggleFavorite(): Promise<void> {
    if (!state.video) return
    const next = !state.video.favorite
    state.video.favorite = next
    await window.api.videosPatch(state.video.id, { favorite: next }).catch(() => {})
  }

  async function saveNotes(notes: string): Promise<void> {
    if (!state.video) return
    state.video.notes = notes
    await window.api.videosPatch(state.video.id, { notes }).catch(() => {})
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
    if (state.loopA !== null && state.loopB !== null && el.currentTime >= state.loopB) {
      el.currentTime = state.loopA
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
    setLoopA,
    setLoopB,
    clearLoop,
    toggleAudioOnly,
    toggleFocusMode,
    markWatched,
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
