import { ref } from 'vue'
import type { VideoDto, VideoListQuery } from '@shared/types'

const listId = ref<string | null>(null)
const ids = ref<string[]>([])
const index = ref<number>(0)
const autoplay = ref<boolean>(true)
const shuffleOn = ref<boolean>(false)
const videos = ref<VideoDto[]>([])

function listQueryFor(id: string): VideoListQuery {
  return id === 'all' ? {} : id === 'favorites' ? { favorites: true } : { collectionId: id }
}

export function useQueue() {
  function setQueue(newListId: string, videoIds: string[], startId?: string): void {
    listId.value = newListId
    ids.value = videoIds
    index.value = startId ? Math.max(0, videoIds.indexOf(startId)) : 0
  }

  function setIndexById(id: string): void {
    const i = ids.value.indexOf(id)
    if (i >= 0) index.value = i
  }

  function hasNext(): boolean {
    return index.value < ids.value.length - 1
  }

  function hasPrev(): boolean {
    return index.value > 0
  }

  function next(): string | null {
    if (!hasNext()) return null
    index.value++
    return ids.value[index.value] ?? null
  }

  function prev(): string | null {
    if (!hasPrev()) return null
    index.value--
    return ids.value[index.value] ?? null
  }

  async function ensureQueue(targetListId: string, currentVideoId: string): Promise<void> {
    if (listId.value === targetListId && ids.value.length) return
    const list = await window.api.videosList(listQueryFor(targetListId))
    setQueue(targetListId, list.map((v) => v.id), currentVideoId)
    videos.value = list
  }

  async function loadQueueVideos(targetListId: string): Promise<void> {
    if (videos.value.length && listId.value === targetListId) return
    const list = await window.api.videosList(listQueryFor(targetListId))
    videos.value = list.filter((v) => ids.value.includes(v.id))
  }

  function shuffleQueue(currentId?: string): void {
    shuffleOn.value = !shuffleOn.value
    if (shuffleOn.value && listId.value) {
      const rest = ids.value.filter((id) => id !== currentId)
      const shuffled = shuffleArray(rest)
      setQueue(listId.value, currentId ? [currentId, ...shuffled] : shuffled, currentId)
    }
  }

  return {
    listId,
    ids,
    index,
    autoplay,
    shuffleOn,
    videos,
    setQueue,
    setIndexById,
    hasNext,
    hasPrev,
    next,
    prev,
    ensureQueue,
    loadQueueVideos,
    shuffleQueue
  }
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}
