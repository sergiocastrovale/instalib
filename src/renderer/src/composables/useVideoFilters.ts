import { computed, ref, type Ref } from 'vue'
import type { VideoDto } from '@shared/types'

export function useVideoFilters(videos: Ref<VideoDto[]>, textFilter: Ref<string>) {
  const authorFilter = ref('all')
  const sortBy = ref('savedAt_desc')

  const authors = computed(() => [...new Set(videos.value.map((v) => v.author).filter((a): a is string => Boolean(a)))])

  const filtered = computed(() => {
    let list = videos.value
    if (authorFilter.value !== 'all') list = list.filter((v) => v.author === authorFilter.value)
    const q = textFilter.value.trim().toLowerCase()
    if (q) list = list.filter((v) => v.author?.toLowerCase().includes(q) || v.caption?.toLowerCase().includes(q))
    const [field, dir] = sortBy.value.split('_') as ['savedAt', 'asc' | 'desc']
    list = [...list].sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      return dir === 'asc' ? av - bv : bv - av
    })
    return list
  })

  return { authorFilter, sortBy, authors, filtered }
}
