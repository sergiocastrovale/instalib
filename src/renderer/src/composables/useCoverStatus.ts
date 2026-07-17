import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CoverFetchStatus } from '@shared/types'

export function useCoverStatus() {
  const coverStatus = ref<CoverFetchStatus | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh(): Promise<void> {
    try {
      coverStatus.value = await window.api.coverFetchStatus()
    } catch (err) {
      console.error('Failed to refresh cover status', err)
    }
  }

  const coverStatusText = computed(() => {
    const s = coverStatus.value
    if (!s) return ''
    if (s.running) return `Downloading ${s.currentLabel} (${s.covered} of ${s.total} covers downloaded)`
    if (s.total === 0) return 'No covers to fetch yet'
    if (s.covered < s.total) return `${s.covered} of ${s.total} covers downloaded`
    return `All ${s.total} covers downloaded`
  })

  onMounted(() => {
    refresh()
    timer = setInterval(refresh, 1000)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  return { coverStatus, coverStatusText, refresh }
}
