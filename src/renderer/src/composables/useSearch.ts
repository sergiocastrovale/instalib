import { computed, type WritableComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { router } from '@/router'
import { useSearchStore } from '@/stores/search'

export function useSearch(): {
  store: ReturnType<typeof useSearchStore>
  query: WritableComputedRef<string>
  submit: (value?: string) => void
} {
  const store = useSearchStore()
  const route = useRoute()

  // writable proxy for a v-model bound directly to the store (desktop live search)
  const query = computed({
    get: () => store.query,
    set: (v: string) => store.setQuery(v)
  })

  // commit a value to the store and open results; safe to call per-keystroke
  // (desktop) or once on enter (mobile).
  function submit(value?: string): void {
    if (value !== undefined) store.setQuery(value)
    if (store.query.trim() && route.name !== 'library') router.push('/')
  }

  return { store, query, submit }
}
