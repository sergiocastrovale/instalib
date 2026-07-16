import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const collectionFilter = ref('')

  const normalizedQuery = computed(() => query.value.trim().toLowerCase())
  const hasQuery = computed(() => normalizedQuery.value.length > 0)

  function setQuery(value: string): void {
    query.value = value
  }

  function clear(): void {
    query.value = ''
  }

  function setCollectionFilter(value: string): void {
    collectionFilter.value = value
  }

  return { query, collectionFilter, normalizedQuery, hasQuery, setQuery, clear, setCollectionFilter }
})
