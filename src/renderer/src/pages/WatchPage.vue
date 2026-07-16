<template>
  <div v-if="!video" class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
    <div class="flex flex-col gap-4">
      <Skeleton class="aspect-video w-full rounded-lg" />
      <Skeleton class="h-6 w-1/3" />
      <Skeleton class="h-24 w-full" />
    </div>
    <div class="flex flex-col gap-1">
      <Skeleton v-for="i in 5" :key="i" class="h-16 w-full rounded-lg" />
    </div>
  </div>
  <div v-else class="grid grid-cols-1 gap-6" :class="player.state.focusMode ? '' : 'lg:grid-cols-[1fr_360px]'">
    <div class="flex flex-col gap-4">
      <div ref="dockSlot" class="w-full overflow-hidden rounded-lg bg-black" />

      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold">{{ video.author ?? video.shortcode }}</h1>
          <p class="text-sm text-muted-foreground">Saved {{ formatDate(video.savedAt) }}</p>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" :class="{ 'text-red-500': video.favorite }" @click="toggleFavorite">
            <HeartIcon class="size-4" :fill="video.favorite ? 'currentColor' : 'none'" /> {{ video.favorite ? 'Favorited' : 'Favorite' }}
          </Button>
          <Button size="sm" variant="outline" :class="{ 'text-primary': video.watched }" @click="toggleWatched">
            <CheckCircle2Icon class="size-4" /> {{ video.watched ? 'Watched' : 'Mark watched' }}
          </Button>
          <Button size="sm" variant="outline" @click="openOnInstagram">
            <ExternalLinkIcon class="size-4" /> Open on Instagram
          </Button>
          <Button size="icon" variant="ghost" @click="showShortcuts = true"><KeyboardIcon class="size-4" /></Button>
        </div>
      </div>

      <p v-if="video.caption && !player.state.focusMode" class="whitespace-pre-line rounded-lg border p-3 text-sm text-muted-foreground">{{ video.caption }}</p>

      <NotesPanel v-if="!player.state.focusMode" :model-value="video.notes" @save="onSaveNotes" />
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
          :class="{ 'bg-accent': qv.id === video.id }"
          @click="playFromQueue(qv.id)"
        >
          <div class="relative aspect-video w-24 shrink-0 overflow-hidden rounded border bg-muted">
            <img v-if="qv.thumbPath" :src="`app-media://thumb/${qv.id}`" class="h-full w-full object-cover" loading="lazy" />
            <div v-else class="flex h-full items-center justify-center"><VideoIcon class="size-4 text-muted-foreground" /></div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium">{{ qv.author ?? qv.shortcode }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ formatDate(qv.savedAt) }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ qv.durationSec ? formatDuration(qv.durationSec) : '' }}</p>
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
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  HeartIcon,
  KeyboardIcon,
  ShuffleIcon,
  VideoIcon
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatDuration } from '@/lib/format'
import { shuffleArray, useQueue } from '@/composables/useQueue'
import { usePlayer } from '@/composables/usePlayer'
import { router } from '@/router'
import NotesPanel from '@/components/NotesPanel.vue'
import type { VideoDto } from '@shared/types'

const route = useRoute()
const videoId = computed(() => route.params.id as string)
const listId = computed(() => (typeof route.query.list === 'string' ? route.query.list : 'all'))

const video = ref<VideoDto | null>(null)

async function loadVideoData(): Promise<void> {
  video.value = await window.api.videosGet(videoId.value)
}

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
  await router.push(`/watch/${id}?list=${listId.value}`)
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

async function toggleWatched(): Promise<void> {
  if (!video.value) return
  video.value.watched = !video.value.watched
  await window.api.videosPatch(video.value.id, { watched: video.value.watched })
}

async function toggleFavorite(): Promise<void> {
  if (!video.value) return
  video.value.favorite = !video.value.favorite
  await window.api.videosPatch(video.value.id, { favorite: video.value.favorite })
}

async function onSaveNotes(notes: string): Promise<void> {
  if (!video.value) return
  video.value.notes = notes
  await window.api.videosPatch(video.value.id, { notes })
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
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  player.state.dockEl = null
  window.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  switch (e.key.toLowerCase()) {
    case ' ':
    case 'k':
      e.preventDefault()
      player.toggle()
      break
    case 'arrowleft':
      player.seekBy(-5)
      break
    case 'arrowright':
      player.seekBy(5)
      break
    case 'j':
      player.seekBy(-10)
      break
    case 'l':
      player.seekBy(10)
      break
    case 'arrowup':
      e.preventDefault()
      player.setVolume(player.state.volume + 0.1)
      break
    case 'arrowdown':
      e.preventDefault()
      player.setVolume(player.state.volume - 0.1)
      break
    case '[':
      player.setSpeed(player.state.speed - 0.25)
      break
    case ']':
      player.setSpeed(player.state.speed + 0.25)
      break
    case 'n':
      player.playNextInQueue()
      break
    case 'p':
      player.playPrevInQueue()
      break
    case 'm':
      player.toggleMuted()
      break
    case 'f':
      player.videoEl.value?.requestFullscreen?.().catch(() => {})
      break
    case 'a':
      player.setLoopA()
      break
    case 'b':
      player.setLoopB()
      break
    case 's':
      toggleFavorite()
      break
    case '?':
      showShortcuts.value = true
      break
  }
}
</script>
