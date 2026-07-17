import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import type { BrowserOption, DataLocation, DbInfo, Settings, SetupStatus } from '@shared/types'

export function useSettingsData() {
  const settings = ref<Settings | null>(null)
  const browsers = ref<BrowserOption[]>([])
  const dataLocation = ref<DataLocation | null>(null)
  const toolStatus = ref<SetupStatus | null>(null)
  const dbInfo = ref<DbInfo | null>(null)
  const updating = ref(false)

  async function load(): Promise<void> {
    try {
      const [s, b, d, t, db] = await Promise.all([
        window.api.settingsGet(),
        window.api.settingsDetectBrowsers(),
        window.api.settingsDataLocation(),
        window.api.setupStatus(),
        window.api.dbInfo()
      ])
      settings.value = s
      browsers.value = b
      toolStatus.value = t
      dataLocation.value = d
      dbInfo.value = db
    } catch {
      toast.error('Failed to load settings')
    }
  }

  const selectedWarning = computed(
    () => browsers.value.find((b) => b.id === settings.value?.cookiesBrowser)?.warning
  )

  async function pickFolder(): Promise<void> {
    const folder = await window.api.settingsPickSyncFolder()
    if (!folder) return
    settings.value = await window.api.settingsSet({ syncFolder: folder })
  }

  async function onBrowserChange(value: unknown): Promise<void> {
    settings.value = await window.api.settingsSet({ cookiesBrowser: value as string })
  }

  async function updateYtDlp(): Promise<void> {
    updating.value = true
    try {
      const { version } = await window.api.setupUpdateYtDlp()
      settings.value = await window.api.settingsGet()
      toast.success(version ? `yt-dlp updated to ${version}` : 'yt-dlp update finished')
    } catch {
      toast.error('yt-dlp update failed')
    } finally {
      updating.value = false
    }
  }

  onMounted(load)

  return {
    settings,
    browsers,
    dataLocation,
    toolStatus,
    dbInfo,
    updating,
    selectedWarning,
    pickFolder,
    onBrowserChange,
    updateYtDlp
  }
}
