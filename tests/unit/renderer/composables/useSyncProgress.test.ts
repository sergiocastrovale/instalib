import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useSyncProgress } from '@/composables/useSyncProgress'
import type { SyncEvent } from '@shared/types'

function mountSyncProgress() {
  let exposed!: ReturnType<typeof useSyncProgress>
  const wrapper = mount(
    defineComponent({
      setup() {
        exposed = useSyncProgress()
        return () => h('div')
      }
    })
  )
  return { wrapper, ...exposed }
}

describe('useSyncProgress handleEvent (via onSyncEvent subscription)', () => {
  it('calls syncStatus on mount and seeds state from it', async () => {
    vi.mocked(window.api.syncStatus).mockResolvedValue({
      running: true,
      currentVideoId: 'v1',
      completed: 2,
      total: 5,
      failed: 1
    })
    const { state } = mountSyncProgress()
    await vi.waitFor(() => expect(state.total).toBe(5))
    expect(state.running).toBe(true)
    expect(state.currentVideoId).toBe('v1')
    expect(state.failed).toBe(1)
  })

  function getHandler(): (e: SyncEvent) => void {
    const call = vi.mocked(window.api.onSyncEvent).mock.calls[0]
    if (!call) throw new Error('onSyncEvent was not subscribed')
    return call[0]
  }

  it('progress event sets currentVideoId and marks running', () => {
    const { state } = mountSyncProgress()
    const handleEvent = getHandler()

    handleEvent({ type: 'progress', videoId: 'v2' })

    expect(state.currentVideoId).toBe('v2')
    expect(state.running).toBe(true)
  })

  it('queue event updates completed/total/failed counters', () => {
    const { state } = mountSyncProgress()
    const handleEvent = getHandler()

    handleEvent({ type: 'queue', completed: 3, total: 8, failed: 1 })

    expect(state.completed).toBe(3)
    expect(state.total).toBe(8)
    expect(state.failed).toBe(1)
  })

  it('log event appends to logs, capped at the last 3', () => {
    const { state } = mountSyncProgress()
    const handleEvent = getHandler()

    handleEvent({ type: 'log', message: 'one' })
    handleEvent({ type: 'log', message: 'two' })
    handleEvent({ type: 'log', message: 'three' })
    handleEvent({ type: 'log', message: 'four' })

    expect(state.logs).toEqual(['two', 'three', 'four'])
  })

  it('idle event clears running state and currentVideoId', () => {
    const { state } = mountSyncProgress()
    const handleEvent = getHandler()

    handleEvent({ type: 'progress', videoId: 'v3' })
    expect(state.running).toBe(true)

    handleEvent({ type: 'idle' })

    expect(state.running).toBe(false)
    expect(state.currentVideoId).toBeNull()
  })
})
