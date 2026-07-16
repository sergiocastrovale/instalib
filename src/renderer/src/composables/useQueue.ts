import { ref } from 'vue'

const listId = ref<string | null>(null)
const ids = ref<string[]>([])
const index = ref<number>(0)
const autoplay = ref<boolean>(true)
const shuffleOn = ref<boolean>(false)

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

  return { listId, ids, index, autoplay, shuffleOn, setQueue, setIndexById, hasNext, hasPrev, next, prev }
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}
