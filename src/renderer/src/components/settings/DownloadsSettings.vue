<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold">Downloads</h2>
        <p class="text-muted-foreground">
          Videos play from the web by default. Sync downloads them locally via yt-dlp for offline playback.
        </p>
      </div>
      <Button v-if="!sync.state.running" :disabled="counts.pending === 0" @click="start">
        <PlayIcon class="size-4" /> Start sync
      </Button>
      <Button v-else variant="destructive" @click="sync.stop">
        <SquareIcon class="size-4" /> Stop
      </Button>
    </div>

    <Card>
      <CardContent class="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
        <div class="rounded-lg border p-3 text-center">
          <p class="text-2xl font-semibold">{{ counts.pending }}</p>
          <p class="text-xs text-muted-foreground">Pending</p>
        </div>
        <div class="rounded-lg border p-3 text-center">
          <p class="text-2xl font-semibold text-emerald-500">{{ counts.downloaded }}</p>
          <p class="text-xs text-muted-foreground">Offline</p>
        </div>
        <div class="rounded-lg border p-3 text-center">
          <p class="text-2xl font-semibold text-destructive">{{ counts.failed }}</p>
          <p class="text-xs text-muted-foreground">Failed</p>
        </div>
        <div class="rounded-lg border p-3 text-center">
          <p class="text-2xl font-semibold text-muted-foreground">{{ counts.skipped }}</p>
          <p class="text-xs text-muted-foreground">Skipped</p>
        </div>
      </CardContent>
    </Card>

    <Card v-if="sync.state.running">
      <CardHeader>
        <CardTitle>Downloading…</CardTitle>
        <CardDescription>{{ sync.state.completed }} / {{ sync.state.total }} processed</CardDescription>
      </CardHeader>
      <CardContent class="space-y-1 font-mono text-xs text-muted-foreground">
        <p v-for="(line, i) in sync.state.logs" :key="i">{{ line }}</p>
      </CardContent>
    </Card>

    <Card v-if="playlists.length">
      <CardHeader>
        <CardTitle>Sync locally</CardTitle>
        <CardDescription>
          Pick which playlists to download and keep on disk. Only selected playlists are fetched when you start a sync.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PlaylistGrid
          mode="select"
          :playlists="playlists"
          :all-saved-count="allSavedCount"
          :selected-ids="selectedIds"
          :all-selected="allSelected"
          @update:selected-ids="onSelectedIds"
          @update:all-selected="onAllSelected"
        />
      </CardContent>
    </Card>

    <Card v-if="failedVideos.length">
      <CardHeader>
        <CardTitle>Failed ({{ failedVideos.length }})</CardTitle>
        <CardDescription>Often means the post was deleted, made private, or the browser cookies are stale.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <div v-for="v in failedVideos" :key="v.id" class="flex items-center justify-between gap-3 rounded border p-2 text-sm">
          <div class="min-w-0">
            <p class="truncate font-medium">{{ v.author ?? v.shortcode }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ v.error }}</p>
          </div>
          <Button size="sm" variant="outline" @click="retry(v.id)">Retry</Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Import more</CardTitle>
        <CardDescription>Upload a fresh export .zip — already-saved videos are updated, not duplicated.</CardDescription>
      </CardHeader>
      <CardContent>
        <ImportDropzone @imported="refreshAll" />
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { PlayIcon, SquareIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PlaylistGrid from '@/components/PlaylistGrid.vue'
import ImportDropzone from '@/components/ImportDropzone.vue'
import { useSyncProgress } from '@/composables/useSyncProgress'
import type { PlaylistDto, Settings, VideoDto } from '@shared/types'

const sync = useSyncProgress()

const playlists = ref<PlaylistDto[]>([])
const settings = ref<Settings | null>(null)
const failedVideos = ref<VideoDto[]>([])
const pendingCount = ref(0)
const downloadedCount = ref(0)
const skippedCount = ref(0)

const allSavedCount = computed(() => playlists.value.reduce((sum, p) => sum + p.videoCount, 0))
const selectedIds = ref<string[]>([])
const allSelected = ref(true)

const counts = computed(() => ({
  pending: pendingCount.value,
  downloaded: downloadedCount.value,
  failed: failedVideos.value.length,
  skipped: skippedCount.value
}))

async function refreshCounts(): Promise<void> {
  const [pending, downloaded, skipped, failed] = await Promise.all([
    window.api.videosList({ status: 'pending' }),
    window.api.videosList({ status: 'downloaded' }),
    window.api.videosList({ status: 'skipped' }),
    window.api.videosList({ status: 'failed' })
  ])
  pendingCount.value = pending.length
  downloadedCount.value = downloaded.length
  skippedCount.value = skipped.length
  failedVideos.value = failed
}

async function refreshPlaylists(): Promise<void> {
  playlists.value = await window.api.playlistsList()
  selectedIds.value = playlists.value.filter((p) => p.syncEnabled).map((p) => p.id)
}

async function refreshAll(): Promise<void> {
  await Promise.all([refreshCounts(), refreshPlaylists()])
}

onMounted(async () => {
  settings.value = await window.api.settingsGet()
  allSelected.value = settings.value.syncUncategorized
  await refreshAll()
})

async function onSelectedIds(ids: string[]): Promise<void> {
  const prev = new Set(selectedIds.value)
  const next = new Set(ids)
  const changed = playlists.value.filter((p) => next.has(p.id) !== prev.has(p.id))
  selectedIds.value = ids
  await Promise.all(changed.map((p) => window.api.playlistsPatch(p.id, { syncEnabled: next.has(p.id) })))
  await refreshPlaylists()
}

async function onAllSelected(value: boolean): Promise<void> {
  allSelected.value = value
  await window.api.settingsSet({ syncUncategorized: value })
}

async function start(): Promise<void> {
  await sync.start()
  await refreshAll()
}

async function retry(id: string): Promise<void> {
  await window.api.videosRetry(id)
  toast.success('Queued for retry')
  await refreshAll()
}

watch(() => sync.state.running, (isRunning, wasRunning) => {
  if (wasRunning && !isRunning) refreshAll()
})
watch(() => sync.state.completed, () => refreshCounts())
</script>
