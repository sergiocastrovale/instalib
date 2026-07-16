<template>
  <div class="flex flex-col gap-8">

    <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <Skeleton v-for="i in 10" :key="i" class="aspect-video rounded-lg" />
    </div>

    <template v-else-if="search.hasQuery">
      <section>
        <h2 class="mb-3 text-lg font-semibold">Results for "{{ search.query }}"</h2>

        <div v-if="!collectionResults.length && !videoResults.length" class="text-sm text-muted-foreground">
          No matches.
        </div>

        <div v-if="collectionResults.length" class="mb-6">
          <h3 class="mb-2 text-sm font-semibold text-muted-foreground">Collections ({{ collectionResults.length }})</h3>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <PlaylistCard v-for="p in collectionResults" :key="p.id" :playlist="p" />
          </div>
        </div>

        <div v-if="videoResults.length">
          <h3 class="mb-2 text-sm font-semibold text-muted-foreground">Videos ({{ videoResults.length }})</h3>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <VideoCard v-for="v in videoResults" :key="v.id" :video="v" list-id="all" />
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <section v-if="continueWatching.length">
        <h2 class="mb-3 text-lg font-semibold">Continue watching</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <VideoCard v-for="v in continueWatching" :key="v.id" :video="v" list-id="all" />
        </div>
      </section>

      <section v-if="!videos.length">
        <div class="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <ClapperboardIcon class="size-10 text-muted-foreground" />
          <div>
            <p class="font-medium">No videos imported yet</p>
            <p class="text-sm text-muted-foreground">Export your saved posts from Instagram, then drop the .zip below.</p>
          </div>
          <div class="w-full max-w-md">
            <ImportDropzone @imported="loadAll" />
          </div>
        </div>
      </section>

      <section v-else>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Playlists</h2>
        </div>
        <PlaylistGrid
          :playlists="playlists"
          :all-saved-count="videos.length"
          :favorites-count="favoritesCount"
          :all-saved-cover-video-id="allSavedCoverVideoId"
          :favorites-cover-video-id="favoritesCoverVideoId"
        />

        <div class="mt-6">
          <ImportDropzone @imported="loadAll" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ClapperboardIcon } from '@lucide/vue'
import { Skeleton } from '@/components/ui/skeleton'
import VideoCard from '@/components/VideoCard.vue'
import PlaylistCard from '@/components/PlaylistCard.vue'
import PlaylistGrid from '@/components/PlaylistGrid.vue'
import ImportDropzone from '@/components/ImportDropzone.vue'
import { useSearchStore } from '@/stores/search'
import type { PlaylistDto, VideoDto } from '@shared/types'

const videos = ref<VideoDto[]>([])
const playlists = ref<PlaylistDto[]>([])
const loading = ref(true)
const search = useSearchStore()

async function loadAll(): Promise<void> {
  loading.value = true
  const [v, p] = await Promise.all([window.api.videosList({}), window.api.playlistsList()])
  videos.value = v
  playlists.value = p
  loading.value = false
}

onMounted(loadAll)

const favoritesCount = computed(() => videos.value.filter((v) => v.favorite).length)

function mostRecentCoverId(list: VideoDto[]): string | null {
  return (
    [...list]
      .filter((v) => v.thumbPath)
      .sort((a, b) => b.savedAt - a.savedAt)[0]?.id ?? null
  )
}

const allSavedCoverVideoId = computed(() => mostRecentCoverId(videos.value))
const favoritesCoverVideoId = computed(() => mostRecentCoverId(videos.value.filter((v) => v.favorite)))

const continueWatching = computed(() =>
  videos.value
    .filter((v) => v.positionSec > 5 && v.durationSec && v.positionSec / v.durationSec < 0.95)
    .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
    .slice(0, 10)
)

const videoResults = computed(() => {
  const q = search.normalizedQuery
  if (!q) return []
  return videos.value.filter(
    (v) => v.author?.toLowerCase().includes(q) || v.caption?.toLowerCase().includes(q) || v.notes?.toLowerCase().includes(q)
  )
})

const collectionResults = computed(() => {
  const q = search.normalizedQuery
  if (!q) return []
  return playlists.value.filter((p) => p.name.toLowerCase().includes(q))
})
</script>
