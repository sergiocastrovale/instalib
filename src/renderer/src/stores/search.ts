import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const playlistFilter = ref('')

  const normalizedQuery = computed(() => query.value.trim().toLowerCase())
  const hasQuery = computed(() => normalizedQuery.value.length > 0)

  function setQuery(value: string): void {
    query.value = value
  }

  function clear(): void {
    query.value = ''
  }

  function setPlaylistFilter(value: string): void {
    playlistFilter.value = value
  }

  return { query, playlistFilter, normalizedQuery, hasQuery, setQuery, clear, setPlaylistFilter }
})
