import { defineComponent, h, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePlayerHotkeys } from '@/composables/usePlayerHotkeys'
import type { usePlayer } from '@/composables/usePlayer'

type Player = ReturnType<typeof usePlayer>

function makeFakePlayer(): Player {
  return {
    state: reactive({ volume: 0.5, speed: 1 }),
    videoEl: { value: null },
    bindVideoEl: vi.fn(),
    loadVideo: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    seek: vi.fn(),
    seekBy: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    toggleMuted: vi.fn(),
    setSpeed: vi.fn(),
    startSection: vi.fn(),
    addSection: vi.fn(),
    toggleAudioOnly: vi.fn(),
    toggleFocusMode: vi.fn(),
    markWatched: vi.fn(),
    toggleWatched: vi.fn(),
    toggleFavorite: vi.fn(),
    saveNotes: vi.fn(),
    playNextInQueue: vi.fn(),
    playPrevInQueue: vi.fn(),
    onTimeUpdate: vi.fn(),
    onLoadedMetadata: vi.fn(),
    onVideoError: vi.fn(),
    retryResolve: vi.fn(),
    onEnded: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn()
  } as unknown as Player
}

function mountHotkeys(player: Player, onHelp = vi.fn()) {
  const wrapper = mount(
    defineComponent({
      setup() {
        usePlayerHotkeys(player, onHelp)
        return () => h('div')
      }
    }),
    { attachTo: document.body }
  )
  return { wrapper, onHelp }
}

function press(key: string, target: EventTarget = window): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('usePlayerHotkeys', () => {
  it('space/k toggles play', () => {
    const player = makeFakePlayer()
    mountHotkeys(player)
    press(' ')
    press('k')
    expect(player.toggle).toHaveBeenCalledTimes(2)
  })

  it('arrow left/right seek by -5/+5, j/l seek by -10/+10', () => {
    const player = makeFakePlayer()
    mountHotkeys(player)
    press('ArrowLeft')
    press('ArrowRight')
    press('j')
    press('l')
    expect(player.seekBy).toHaveBeenNthCalledWith(1, -5)
    expect(player.seekBy).toHaveBeenNthCalledWith(2, 5)
    expect(player.seekBy).toHaveBeenNthCalledWith(3, -10)
    expect(player.seekBy).toHaveBeenNthCalledWith(4, 10)
  })

  it('arrow up/down adjust volume relative to current state', () => {
    const player = makeFakePlayer()
    mountHotkeys(player)
    press('ArrowUp')
    expect(player.setVolume).toHaveBeenCalledWith(0.6)
    press('ArrowDown')
    expect(player.setVolume).toHaveBeenCalledWith(0.4)
  })

  it('[ and ] adjust speed relative to current state', () => {
    const player = makeFakePlayer()
    mountHotkeys(player)
    press('[')
    expect(player.setSpeed).toHaveBeenCalledWith(0.75)
    press(']')
    expect(player.setSpeed).toHaveBeenCalledWith(1.25)
  })

  it('n/p advance the queue, m toggles mute, s toggles favorite', () => {
    const player = makeFakePlayer()
    mountHotkeys(player)
    press('n')
    press('p')
    press('m')
    press('s')
    expect(player.playNextInQueue).toHaveBeenCalled()
    expect(player.playPrevInQueue).toHaveBeenCalled()
    expect(player.toggleMuted).toHaveBeenCalled()
    expect(player.toggleFavorite).toHaveBeenCalled()
  })

  it('a/b mark section start/end', () => {
    const player = makeFakePlayer()
    mountHotkeys(player)
    press('a')
    press('b')
    expect(player.startSection).toHaveBeenCalled()
    expect(player.addSection).toHaveBeenCalled()
  })

  it('? invokes the onHelp callback', () => {
    const player = makeFakePlayer()
    const { onHelp } = mountHotkeys(player)
    press('?')
    expect(onHelp).toHaveBeenCalled()
  })

  it('ignores keystrokes while focus is in an input/textarea/select', () => {
    const player = makeFakePlayer()
    mountHotkeys(player)
    const input = document.createElement('input')
    document.body.appendChild(input)

    press(' ', input)

    expect(player.toggle).not.toHaveBeenCalled()
  })
})
