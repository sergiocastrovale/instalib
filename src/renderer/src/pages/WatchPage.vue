<template>
  <div v-if="notFound" class="flex flex-col items-center gap-2 py-16 text-center">
    <p class="text-lg font-semibold">Video not found</p>
    <p class="text-sm text-muted-foreground">It may have been deleted.</p>
  </div>
  <div v-else-if="!video" class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
    <div class="flex flex-col gap-4">
      <Skeleton class="aspect-video w-full rounded-lg" />
      <Skeleton class="h-6 w-1/3" />
      <Skeleton class="h-24 w-full" />
    </div>
    <div class="flex flex-col gap-1">
      <Skeleton v-for="i in 5" :key="i" class="h-16 w-full rounded-lg" />
    </div>
  </div>
  <div v-else class="flex flex-col gap-4">
    <Breadcrumbs :items="breadcrumbItems" />

    <div class="grid grid-cols-1 gap-6" :class="player.state.focusMode ? '' : 'lg:grid-cols-[1fr_360px]'">
    <div class="flex flex-col gap-4">
      <div ref="dockSlot" class="w-full overflow-hidden rounded-lg bg-black" />

      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="truncate text-[22.8px] font-semibold">{{ video.author ?? video.shortcode }}</h1>
          <p class="text-sm text-muted-foreground">Saved {{ formatDate(video.savedAt) }}</p>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" :class="{ 'text-destructive': video.favorite }" @click="player.toggleFavorite">
            <HeartIcon class="size-4" :fill="video.favorite ? 'currentColor' : 'none'" /> {{ video.favorite ? 'Favorited' : 'Favorite' }}
          </Button>
          <Button size="sm" variant="outline" :class="{ 'text-primary': video.watched }" @click="player.toggleWatched">
            <CheckCircle2Icon class="size-4" /> {{ video.watched ? 'Watched' : 'Mark watched' }}
          </Button>
          <Button size="sm" variant="outline" @click="openOnInstagram">
            <ExternalLinkIcon class="size-4" /> Open on Instagram
          </Button>
          <Button size="icon" variant="ghost" @click="showShortcuts = true"><KeyboardIcon class="size-4" /></Button>
        </div>
      </div>

      <p v-if="video.caption && !player.state.focusMode" class="whitespace-pre-line rounded-lg border p-3 text-sm text-muted-foreground">{{ video.caption }}</p>

      <NotesPanel v-if="!player.state.focusMode" :model-value="video.notes" @save="player.saveNotes" />
    </div>

    <aside v-if="!player.state.focusMode" class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Up next</h2>
        <div class="flex items-center gap-1">
          <Button size="sm" variant="ghost" :class="{ 'text-primary': queue.autoplay.value }" @click="queue.autoplay.value = !queue.autoplay.value">
            Autoplay
          </Button>
          <Button size="icon" variant="ghost" :class="{ 'text-primary': queue.shuffleOn.value }" @click="shuffleQueue">
            <ShuffleIcon class="size-4" />
          </Button>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <button
          v-for="qv in queueVideos"
          :key="qv.id"
          class="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-left hover:bg-accent"
          :class="{ 'bg-primary/15': qv.id === video.id }"
          @click="playFromQueue(qv.id)"
        >
          <div class="relative aspect-video w-[104px] shrink-0 overflow-hidden rounded border bg-muted">
            <img v-if="qv.thumbPath" :src="`app-media://thumb/${qv.id}`" class="h-full w-full object-cover" loading="lazy" />
            <div v-else class="flex h-full items-center justify-center"><VideoIcon class="size-4 text-muted-foreground" /></div>
            <div v-if="qv.id === video.id" class="absolute inset-0 flex items-center justify-center bg-black/20">
              <PlayIcon class="size-5 fill-white text-white" />
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium" :class="{ 'text-primary': qv.id === video.id }">{{ qv.author ?? qv.shortcode }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ formatDate(qv.savedAt) }}</p>
            <div class="flex items-center gap-1">
              <CheckCircle2Icon v-if="qv.watched" class="size-3 text-emerald-500" />
              <p class="truncate font-mono text-xs text-muted-foreground">{{ qv.durationSec ? formatDuration(qv.durationSec) : '' }}</p>
            </div>
          </div>
        </button>
      </div>
    </aside>

    <Dialog v-model:open="showShortcuts">
      <DialogContent>
        <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <span class="text-muted-foreground">Play / pause</span><span>Space or K</span>
          <span class="text-muted-foreground">Seek ± 5s</span><span>← / →</span>
          <span class="text-muted-foreground">Seek ± 10s</span><span>J / L</span>
          <span class="text-muted-foreground">Volume</span><span>↑ / ↓</span>
          <span class="text-muted-foreground">Speed step</span><span>[ / ]</span>
          <span class="text-muted-foreground">Next / previous</span><span>N / P</span>
          <span class="text-muted-foreground">Mute</span><span>M</span>
          <span class="text-muted-foreground">Fullscreen</span><span>F</span>
          <span class="text-muted-foreground">Set loop A / B</span><span>A / B</span>
          <span class="text-muted-foreground">Favorite</span><span>S</span>
          <span class="text-muted-foreground">This help</span><span>?</span>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  HeartIcon,
  KeyboardIcon,
  PlayIcon,
  ShuffleIcon,
  VideoIcon
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatDuration } from '@/lib/format'
import { shuffleArray, useQueue } from '@/composables/useQueue'
import { usePlayer } from '@/composables/usePlayer'
import { usePlayerHotkeys } from '@/composables/usePlayerHotkeys'
import { router } from '@/router'
import NotesPanel from '@/components/NotesPanel.vue'
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs.vue'
import type { CollectionDto, VideoDto } from '@shared/types'

const route = useRoute()
const videoId = computed(() => route.params.id as string)
const listId = computed(() => (typeof route.query.list === 'string' ? route.query.list : 'all'))
const fromOrigin = computed(() => (route.query.from === 'search' ? 'search' : 'home'))

const video = ref<VideoDto | null>(null)
const collections = ref<CollectionDto[]>([])
const notFound = ref(false)

async function loadVideoData(): Promise<void> {
  const requestedId = videoId.value
  notFound.value = false
  const result = await window.api.videosGet(requestedId)
  if (videoId.value !== requestedId) return
  video.value = result
  notFound.value = result === null
}

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const rootLabel = fromOrigin.value === 'search' ? 'Search' : 'Home'
  const items: BreadcrumbItem[] = [{ label: rootLabel, to: '/' }]
  if (listId.value === 'favorites') {
    items.push({ label: 'Favorites', to: '/collection/favorites' })
  } else if (listId.value !== 'all') {
    const name = collections.value.find((c) => c.id === listId.value)?.name ?? 'Collection'
    items.push({ label: name, to: `/collection/${listId.value}` })
  }
  items.push({ label: video.value?.author ?? video.value?.shortcode ?? '' })
  return items
})

const player = usePlayer()
const queue = useQueue()

const queueVideos = ref<VideoDto[]>([])
const showShortcuts = ref(false)
const dockSlot = ref<HTMLElement | null>(null)

async function ensureQueue(): Promise<void> {
  if (queue.listId.value === listId.value && queue.ids.value.length) return
  const query = listId.value === 'all' ? {} : listId.value === 'favorites' ? { favorites: true } : { collectionId: listId.value }
  const list = await window.api.videosList(query)
  const ids = list.map((v) => v.id)
  queue.setQueue(listId.value, ids, videoId.value)
  queueVideos.value = list
}

async function loadQueueVideos(): Promise<void> {
  if (queueVideos.value.length && queue.listId.value === listId.value) return
  const query = listId.value === 'all' ? {} : listId.value === 'favorites' ? { favorites: true } : { collectionId: listId.value }
  const list = await window.api.videosList(query)
  queueVideos.value = list.filter((v) => queue.ids.value.includes(v.id))
}

async function playFromQueue(id: string): Promise<void> {
  await router.push(`/watch/${id}?list=${listId.value}&from=${fromOrigin.value}`)
}

function shuffleQueue(): void {
  queue.shuffleOn.value = !queue.shuffleOn.value
  if (queue.shuffleOn.value) {
    const currentId = video.value?.id
    const rest = queue.ids.value.filter((id) => id !== currentId)
    const shuffled = shuffleArray(rest)
    queue.setQueue(listId.value, currentId ? [currentId, ...shuffled] : shuffled, currentId)
  }
}

async function openOnInstagram(): Promise<void> {
  if (!video.value) return
  await window.api.shellOpenExternal(video.value.permalink)
}

watch(videoId, loadVideoData, { immediate: true })

watch(video, async (v) => {
  if (!v) return
  await ensureQueue()
  await loadQueueVideos()
  if (player.state.video?.id !== v.id) {
    await player.loadVideo(v)
  }
})

watch(dockSlot, (el) => {
  player.state.dockEl = el
}, { immediate: true })

onMounted(() => {
  window.api.collectionsList().then((c) => (collections.value = c))
})

onUnmounted(() => {
  player.state.dockEl = null
})

usePlayerHotkeys(player, () => (showShortcuts.value = true))
</script>
