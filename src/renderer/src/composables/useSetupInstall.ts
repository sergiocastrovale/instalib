import { onBeforeUnmount, onMounted, ref } from 'vue'
import { router } from '@/router'

export function useSetupInstall() {
  const ytDlpPct = ref(0)
  const ffmpegPct = ref(0)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  async function run(): Promise<void> {
    error.value = null
    ytDlpPct.value = 0
    ffmpegPct.value = 0
    try {
      await window.api.setupInstall()
      await router.replace('/')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Setup failed'
    }
  }

  onMounted(() => {
    unsubscribe = window.api.onSetupProgress((e) => {
      if (e.binary === 'yt-dlp') ytDlpPct.value = e.pct
      if (e.binary === 'ffmpeg') ffmpegPct.value = e.pct
      if (e.phase === 'error') error.value = e.error ?? 'Setup failed'
    })
    run()
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
  })

  return { ytDlpPct, ffmpegPct, error, run }
}
