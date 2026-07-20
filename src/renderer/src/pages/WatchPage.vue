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
          <Button size="sm" variant="outline" :class="{ 'text-destructive': activeVideo!.favorite }" @click="player.toggleFavorite">
            <HeartIcon class="size-4" :fill="activeVideo!.favorite ? 'currentColor' : 'none'" /> {{ activeVideo!.favorite ? 'Favorited' : 'Favorite' }}
          </Button>
          <Button size="sm" variant="outline" :class="{ 'text-primary': activeVideo!.watched }" @click="player.toggleWatched">
            <CheckCircle2Icon class="size-4" /> {{ activeVideo!.watched ? 'Watched' : 'Mark watched' }}
          </Button>
          <Button size="sm" variant="outline" @click="openOnInstagram">
            <ExternalLinkIcon class="size-4" /> Open on Instagram
          </Button>
          <Button size="icon" variant="ghost" @click="showShortcuts = true"><KeyboardIcon class="size-4" /></Button>
        </div>
      </div>

      <p v-if="video.caption && !player.state.focusMode" class="whitespace-pre-line rounded-lg border p-3 text-sm text-muted-foreground">{{ video.caption }}</p>

      <NotesPanel v-if="!player.state.focusMode" :model-value="activeVideo!.notes" @save="player.saveNotes" />
    </div>

    <div v-if="!player.state.focusMode" class="flex flex-col gap-6">
      <SectionsPanel
        v-if="activeVideo!.sections.length"
        :sections="activeVideo!.sections"
        :active-id="player.state.activeSectionId"
        :rep-count="player.state.repCount"
        :speed="player.state.speed"
        @play="player.playSection"
        @edit="openEdit"
        @delete="player.deleteSection"
        @stop-looping="player.stopLooping"
      />
      <QueueList
        :videos="queue.videos.value"
        :active-id="video.id"
        :autoplay="queue.autoplay.value"
        :shuffle-on="queue.shuffleOn.value"
        :list-id="listId"
        :from="fromOrigin"
        @update:autoplay="queue.autoplay.value = $event"
        @shuffle="queue.shuffleQueue(video.id)"
      />
    </div>

    <ShortcutsDialog v-model:open="showShortcuts" />
    <SectionEditDialog v-model:open="editOpen" :section="editingSection" @save="onSaveSection" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CheckCircle2Icon, ExternalLinkIcon, HeartIcon, KeyboardIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { useQueue } from '@/composables/useQueue'
import { usePlayer } from '@/composables/usePlayer'
import { usePlayerHotkeys } from '@/composables/usePlayerHotkeys'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import NotesPanel from '@/components/NotesPanel.vue'
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs.vue'
import QueueList from '@/components/QueueList.vue'
import ShortcutsDialog from '@/components/ShortcutsDialog.vue'
import SectionsPanel from '@/components/SectionsPanel.vue'
import SectionEditDialog from '@/components/SectionEditDialog.vue'
import type { CollectionDto, VideoDto, VideoSection } from '@shared/types'

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

const { root } = useBreadcrumbs(fromOrigin)
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [root.value]
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

// player.loadVideo() is sometimes skipped for the current video (e.g. after
// next/prev/autoplay already loaded it into player.state.video before the
// route change lands here) - in that case this ref's own fetch is a separate
// object that never receives the player's mutations (favorite/watched/notes/
// sections). Prefer player.state.video whenever it's the same video.
const activeVideo = computed<VideoDto | null>(() => {
  const pv = player.state.video
  return pv && video.value && pv.id === video.value.id ? pv : video.value
})

const showShortcuts = ref(false)
const dockSlot = ref<HTMLElement | null>(null)
const editOpen = ref(false)
const editingSection = ref<VideoSection | null>(null)

function openEdit(sec: VideoSection): void {
  editingSection.value = sec
  editOpen.value = true
}

function onSaveSection(payload: Partial<Omit<VideoSection, 'id'>>): void {
  if (editingSection.value) player.updateSection(editingSection.value.id, payload)
}

async function openOnInstagram(): Promise<void> {
  if (!video.value) return
  await window.api.shellOpenExternal(video.value.permalink)
}

watch(videoId, loadVideoData, { immediate: true })

watch(video, async (v) => {
  if (!v) return
  await queue.ensureQueue(listId.value, videoId.value)
  await queue.loadQueueVideos(listId.value)
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
