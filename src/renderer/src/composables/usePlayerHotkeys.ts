import { onMounted, onUnmounted } from 'vue'
import type { usePlayer } from './usePlayer'

export interface ShortcutRow {
  label: string
  keys: string
}

export const PLAYER_SHORTCUTS: ShortcutRow[] = [
  { label: 'Play / pause', keys: 'Space or K' },
  { label: 'Seek ± 5s', keys: '← / →' },
  { label: 'Seek ± 10s', keys: 'J / L' },
  { label: 'Volume', keys: '↑ / ↓' },
  { label: 'Speed step', keys: '[ / ]' },
  { label: 'Next / previous', keys: 'N / P' },
  { label: 'Mute', keys: 'M' },
  { label: 'Fullscreen', keys: 'F' },
  { label: 'Mark section start / end', keys: 'A / B' },
  { label: 'Favorite', keys: 'S' },
  { label: 'This help', keys: '?' }
]

export function usePlayerHotkeys(player: ReturnType<typeof usePlayer>, onHelp: () => void): void {
  function onKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault()
        player.toggle()
        break
      case 'arrowleft':
        e.preventDefault()
        player.seekBy(-5)
        break
      case 'arrowright':
        e.preventDefault()
        player.seekBy(5)
        break
      case 'j':
        e.preventDefault()
        player.seekBy(-10)
        break
      case 'l':
        e.preventDefault()
        player.seekBy(10)
        break
      case 'arrowup':
        e.preventDefault()
        player.setVolume(player.state.volume + 0.1)
        break
      case 'arrowdown':
        e.preventDefault()
        player.setVolume(player.state.volume - 0.1)
        break
      case '[':
        player.setSpeed(player.state.speed - 0.25)
        break
      case ']':
        player.setSpeed(player.state.speed + 0.25)
        break
      case 'n':
        player.playNextInQueue()
        break
      case 'p':
        player.playPrevInQueue()
        break
      case 'm':
        player.toggleMuted()
        break
      case 'f':
        player.videoEl.value?.requestFullscreen?.().catch(() => {})
        break
      case 'a':
        player.startSection()
        break
      case 'b':
        player.addSection()
        break
      case 's':
        player.toggleFavorite()
        break
      case '?':
        onHelp()
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
