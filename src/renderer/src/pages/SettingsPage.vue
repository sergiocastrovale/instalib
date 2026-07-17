<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-6">
    <h1 class="text-2xl font-semibold">Settings</h1>

    <Tabs default-value="downloads">
      <TabsList>
        <TabsTrigger value="downloads">Downloads</TabsTrigger>
        <TabsTrigger value="setup">Setup</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="downloads" class="flex flex-col gap-6">
        <DownloadsSettings />
      </TabsContent>

      <TabsContent value="setup" class="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Instagram cookies</CardTitle>
            <CardDescription>
              Used by yt-dlp to resolve and download your saved videos. Pick the browser you're logged into Instagram with.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Select :model-value="settings?.cookiesBrowser ?? undefined" @update:model-value="onBrowserChange">
              <SelectTrigger class="w-56"><SelectValue placeholder="Select a browser" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="b in browsers" :key="b.id" :value="b.id">{{ b.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="selectedWarning" class="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <TriangleAlertIcon class="size-3.5 shrink-0 mt-0.5" /> {{ selectedWarning }}
            </p>
            <p v-if="!browsers.length" class="text-xs text-muted-foreground">No supported browsers detected on this machine.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>yt-dlp</CardTitle>
            <CardDescription>Instagram changes often break video resolution — keep yt-dlp updated.</CardDescription>
          </CardHeader>
          <CardContent class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">
              Version: <span class="font-mono">{{ toolStatus?.ytDlpVersion ?? 'unknown' }}</span>
            </span>
            <Button variant="outline" :disabled="updating" @click="updateYtDlp">
              <Loader2Icon v-if="updating" class="size-4 animate-spin" />
              Update yt-dlp
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync folder</CardTitle>
            <CardDescription>Where synced videos are saved. Defaults to your OS Videos folder.</CardDescription>
          </CardHeader>
          <CardContent class="flex items-center gap-2">
            <Input :model-value="settings?.syncFolder ?? ''" readonly class="flex-1 bg-secondary font-mono text-xs" />
            <Button variant="outline" @click="pickFolder">Change…</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              Data location
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="dataLocation?.portable ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-primary/15 text-primary'"
              >
                {{ dataLocation?.portable ? 'Portable' : 'Installed' }}
              </span>
            </CardTitle>
            <CardDescription>
              {{
                dataLocation?.portable
                  ? "Everything (database and downloaded tools) lives next to this executable — nothing was installed to your system."
                  : 'Database and downloaded tools live in your OS profile folder.'
              }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Input :model-value="dataLocation?.path ?? ''" readonly class="bg-secondary font-mono text-xs" />
            <div class="space-y-1.5 text-sm">
              <div class="flex items-center gap-2">
                <CheckIcon class="size-4 text-emerald-500" />
                <span>Database</span>
                <span v-if="dbInfo" class="font-mono text-xs text-muted-foreground">
                  {{ dbInfo.engine }} · SQLite {{ dbInfo.sqliteVersion }} · schema v{{ dbInfo.schemaVersion }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <CheckIcon v-if="toolStatus?.ytDlp" class="size-4 text-emerald-500" />
                <XIcon v-else class="size-4 text-destructive" />
                <span>yt-dlp</span>
                <span v-if="toolStatus?.ytDlpVersion" class="font-mono text-xs text-muted-foreground">{{ toolStatus.ytDlpVersion }}</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckIcon v-if="toolStatus?.ffmpeg" class="size-4 text-emerald-500" />
                <XIcon v-else class="size-4 text-destructive" />
                <span>ffmpeg</span>
                <span v-if="toolStatus?.ffmpegVersion" class="font-mono text-xs text-muted-foreground">{{ toolStatus.ffmpegVersion }}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="data" class="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Import more</CardTitle>
            <CardDescription>Upload a fresh export .zip — already-saved videos are updated, not duplicated.</CardDescription>
          </CardHeader>
          <CardContent>
            <ImportDropzone @imported="lib.refresh" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Covers</CardTitle>
            <CardDescription>Thumbnail images fetched in the background for saved videos.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-1">
            <p class="flex items-center gap-2 text-sm">
              <Loader2Icon v-if="coverStatus?.running" class="size-3.5 animate-spin text-muted-foreground" />
              {{ coverStatusText }}
            </p>
          </CardContent>
        </Card>

        <Card class="border-destructive/50">
          <CardHeader>
            <CardTitle class="text-destructive">Purge database</CardTitle>
            <CardDescription>
              Stops any download or cover fetch in progress and deletes everything from the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" @click="showPurgeConfirm = true">Purge database</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Dialog v-model:open="showPurgeConfirm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This stops any download or cover fetch in progress and permanently deletes all saved videos,
            collections, and notes from the database. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <Label>Also remove all downloaded videos</Label>
            <Switch v-model="removeVideos" />
          </div>
          <div class="flex items-center justify-between gap-2">
            <Label>Also remove all downloaded video cover images</Label>
            <Switch v-model="removeCovers" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showPurgeConfirm = false">Cancel</Button>
          <Button variant="destructive" :disabled="purging" @click="confirmPurge">
            <Loader2Icon v-if="purging" class="size-4 animate-spin" />
            Purge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CheckIcon, Loader2Icon, TriangleAlertIcon, XIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DownloadsSettings from '@/components/settings/DownloadsSettings.vue'
import ImportDropzone from '@/components/ImportDropzone.vue'
import { useLibraryStore } from '@/stores/library'
import type { BrowserOption, CoverFetchStatus, DataLocation, DbInfo, Settings, SetupStatus } from '@shared/types'

const lib = useLibraryStore()
const settings = ref<Settings | null>(null)
const browsers = ref<BrowserOption[]>([])
const dataLocation = ref<DataLocation | null>(null)
const toolStatus = ref<SetupStatus | null>(null)
const dbInfo = ref<DbInfo | null>(null)
const updating = ref(false)
const coverStatus = ref<CoverFetchStatus | null>(null)
let coverStatusTimer: ReturnType<typeof setInterval> | null = null
const showPurgeConfirm = ref(false)
const removeVideos = ref(true)
const removeCovers = ref(true)
const purging = ref(false)

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

async function refreshCoverStatus(): Promise<void> {
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
  load()
  refreshCoverStatus()
  coverStatusTimer = setInterval(refreshCoverStatus, 1000)
})

onBeforeUnmount(() => {
  if (coverStatusTimer) clearInterval(coverStatusTimer)
})

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

async function confirmPurge(): Promise<void> {
  purging.value = true
  try {
    await window.api.dbPurge({ removeVideos: removeVideos.value, removeCovers: removeCovers.value })
    showPurgeConfirm.value = false
    toast.success('Database purged')
    await refreshCoverStatus()
  } catch {
    toast.error('Purge failed')
  } finally {
    purging.value = false
  }
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
</script>
