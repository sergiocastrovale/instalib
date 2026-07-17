import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoDto } from '@shared/types'

let useQueueModule: typeof import('@/composables/useQueue')

beforeEach(async () => {
  vi.resetModules()
  useQueueModule = await import('@/composables/useQueue')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shuffleArray', () => {
  it('returns an array with the same membership and length', () => {
    const input = [1, 2, 3, 4, 5]
    const result = useQueueModule.shuffleArray(input)
    expect(result).toHaveLength(input.length)
    expect([...result].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    useQueueModule.shuffleArray(input)
    expect(input).toEqual(copy)
  })
})

describe('useQueue', () => {
  it('setQueue + setIndexById sets the current index by video id', () => {
    const { setQueue, setIndexById, index } = useQueueModule.useQueue()
    setQueue('all', ['a', 'b', 'c'])
    setIndexById('b')
    expect(index.value).toBe(1)
  })

  it('setIndexById is a no-op for an id not in the queue', () => {
    const { setQueue, setIndexById, index } = useQueueModule.useQueue()
    setQueue('all', ['a', 'b', 'c'], 'b')
    setIndexById('not-in-queue')
    expect(index.value).toBe(1)
  })

  it('hasNext/hasPrev/next/prev reflect position within the queue', () => {
    const { setQueue, hasNext, hasPrev, next, prev } = useQueueModule.useQueue()
    setQueue('all', ['a', 'b', 'c'], 'b')

    expect(hasNext()).toBe(true)
    expect(hasPrev()).toBe(true)
    expect(next()).toBe('c')
    expect(prev()).toBe('a')
  })

  it('next()/hasNext() at the end of the queue', () => {
    const { setQueue, hasNext, next } = useQueueModule.useQueue()
    setQueue('all', ['a', 'b', 'c'], 'c')
    expect(hasNext()).toBe(false)
    expect(next()).toBeNull()
  })

  it('prev()/hasPrev() at the start of the queue', () => {
    const { setQueue, hasPrev, prev } = useQueueModule.useQueue()
    setQueue('all', ['a', 'b', 'c'], 'a')
    expect(hasPrev()).toBe(false)
    expect(prev()).toBeNull()
  })

  it('ensureQueue fetches and sets the queue only when the listId or ids differ', async () => {
    const listResult = [{ id: 'a' } as VideoDto]
    vi.mocked(window.api.videosList).mockResolvedValue(listResult)

    const { ensureQueue, listId } = useQueueModule.useQueue()
    await ensureQueue('all', 'a')
    expect(listId.value).toBe('all')
    expect(window.api.videosList).toHaveBeenCalledTimes(1)

    // same listId with ids already populated - should skip refetching
    await ensureQueue('all', 'a')
    expect(window.api.videosList).toHaveBeenCalledTimes(1)
  })
})
