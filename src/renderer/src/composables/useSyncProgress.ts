import { onBeforeUnmount, onMounted, reactive } from 'vue'
import type { SyncEvent, SyncStatus } from '@shared/types'

interface SyncProgressState {
  running: boolean
  completed: number
  total: number
  currentVideoId: string | null
  logs: string[]
}

const state = reactive<SyncProgressState>({
  running: false,
  completed: 0,
  total: 0,
  currentVideoId: null,
  logs: []
})

export function useSyncProgress() {
  let unsubscribe: (() => void) | null = null

  async function refresh(): Promise<void> {
    const status: SyncStatus = await window.api.syncStatus()
    state.running = status.running
    state.completed = status.completed
    state.total = status.total
    state.currentVideoId = status.currentVideoId
  }

  function handleEvent(e: SyncEvent): void {
    if (e.type === 'progress') {
      state.currentVideoId = e.videoId ?? state.currentVideoId
    } else if (e.type === 'queue') {
      state.completed = e.completed ?? state.completed
      state.total = e.total ?? state.total
    } else if (e.type === 'log') {
      state.logs.push(e.message ?? '')
      if (state.logs.length > 3) state.logs.shift()
    } else if (e.type === 'idle') {
      state.running = false
      state.currentVideoId = null
    }
    if (e.type === 'progress') state.running = true
  }

  onMounted(() => {
    refresh()
    unsubscribe = window.api.onSyncEvent(handleEvent)
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
  })

  async function start(collectionId?: string): Promise<void> {
    await window.api.syncStart({ collectionId })
    await refresh()
  }

  async function stop(): Promise<void> {
    await window.api.syncStop()
  }

  return { state, start, stop, refresh }
}
