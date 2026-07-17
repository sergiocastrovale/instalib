import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useVideoFilters } from '@/composables/useVideoFilters'
import type { VideoDto } from '@shared/types'

function makeVideo(overrides: Partial<VideoDto>): VideoDto {
  return {
    id: overrides.id ?? Math.random().toString(36),
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: null,
    caption: null,
    savedAt: 0,
    durationSec: null,
    filePath: null,
    thumbPath: null,
    status: 'downloaded',
    error: null,
    positionSec: 0,
    speed: 1,
    watched: false,
    favorite: false,
    notes: '',
    lastPlayedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

describe('useVideoFilters', () => {
  it('lists distinct authors, dropping null/empty', () => {
    const videos = ref<VideoDto[]>([
      makeVideo({ author: 'alice' }),
      makeVideo({ author: 'bob' }),
      makeVideo({ author: 'alice' }),
      makeVideo({ author: null })
    ])
    const { authors } = useVideoFilters(videos, ref(''))
    expect([...authors.value].sort()).toEqual(['alice', 'bob'])
  })

  it('authorFilter narrows the filtered list', () => {
    const videos = ref<VideoDto[]>([makeVideo({ id: 'a', author: 'alice' }), makeVideo({ id: 'b', author: 'bob' })])
    const { authorFilter, filtered } = useVideoFilters(videos, ref(''))
    authorFilter.value = 'alice'
    expect(filtered.value.map((v) => v.id)).toEqual(['a'])
  })

  it('text search matches author or caption case-insensitively', () => {
    const videos = ref<VideoDto[]>([
      makeVideo({ id: 'a', author: 'Wombat Watcher', caption: null }),
      makeVideo({ id: 'b', author: 'other', caption: 'a Wombat cameo' }),
      makeVideo({ id: 'c', author: 'nomatch', caption: null })
    ])
    const { filtered } = useVideoFilters(videos, ref('wombat'))
    expect(filtered.value.map((v) => v.id).sort()).toEqual(['a', 'b'])
  })

  it('sortBy parses "field_direction" and sorts accordingly', () => {
    const videos = ref<VideoDto[]>([
      makeVideo({ id: 'a', savedAt: 100 }),
      makeVideo({ id: 'b', savedAt: 300 }),
      makeVideo({ id: 'c', savedAt: 200 })
    ])
    const { sortBy, filtered } = useVideoFilters(videos, ref(''))

    sortBy.value = 'savedAt_desc'
    expect(filtered.value.map((v) => v.id)).toEqual(['b', 'c', 'a'])

    sortBy.value = 'savedAt_asc'
    expect(filtered.value.map((v) => v.id)).toEqual(['a', 'c', 'b'])
  })
})
