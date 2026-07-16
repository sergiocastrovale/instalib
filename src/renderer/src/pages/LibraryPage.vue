<template>
  <div class="flex flex-col gap-8">

    <div v-if="lib.loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <Skeleton v-for="i in 10" :key="i" class="aspect-video rounded-lg" />
    </div>

    <template v-else-if="search.hasQuery">
      <section>
        <h2 class="mb-3 text-[22.8px] font-semibold">Results for "{{ search.query }}"</h2>

        <div v-if="!collectionResults.length && !videoResults.length" class="text-sm text-muted-foreground">
          No matches.
        </div>

        <div v-if="collectionResults.length" class="mb-6">
          <h3 class="mb-2 text-sm font-semibold text-muted-foreground">Collections ({{ collectionResults.length }})</h3>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <CollectionCard v-for="c in collectionResults" :key="c.id" :collection="c" from="search" />
          </div>
        </div>

        <div v-if="videoResults.length">
          <h3 class="mb-2 text-sm font-semibold text-muted-foreground">Videos ({{ videoResults.length }})</h3>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <VideoCard v-for="v in videoResults" :key="v.id" :video="v" list-id="all" from="search" />
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <section v-if="continueWatching.length">
        <h2 class="mb-3 text-[25.2px] font-bold tracking-[-0.01em]">Jump back in</h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <VideoCard v-for="v in continueWatching" :key="v.id" :video="v" list-id="all" variant="resume" from="home" />
        </div>
      </section>

      <section v-if="!lib.videos.length">
        <div class="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <ClapperboardIcon class="size-10 text-muted-foreground" />
          <div>
            <p class="font-medium">No videos imported yet</p>
            <p class="text-sm text-muted-foreground">Export your saved posts from Instagram, then drop the .zip below.</p>
          </div>
          <div class="w-full max-w-md">
            <ImportDropzone @imported="lib.refresh" />
          </div>
        </div>
      </section>

      <section v-else>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-[25.2px] font-bold tracking-[-0.01em]">Collections</h2>
        </div>
        <CollectionGrid
          :collections="lib.collections"
          :all-saved-count="lib.videos.length"
          :favorites-count="lib.favoritesCount"
          :all-saved-cover-video-id="allSavedCoverVideoId"
          :favorites-cover-video-id="favoritesCoverVideoId"
        />

        <div class="mt-6">
          <ImportDropzone @imported="lib.refresh" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ClapperboardIcon } from '@lucide/vue'
import { Skeleton } from '@/components/ui/skeleton'
import VideoCard from '@/components/VideoCard.vue'
import CollectionCard from '@/components/CollectionCard.vue'
import CollectionGrid from '@/components/CollectionGrid.vue'
import ImportDropzone from '@/components/ImportDropzone.vue'
import { useSearchStore } from '@/stores/search'
import { useLibraryStore } from '@/stores/library'
import type { VideoDto } from '@shared/types'

const search = useSearchStore()
const lib = useLibraryStore()

onMounted(() => {
  if (!lib.loaded) lib.refresh()
})

function mostRecentCoverId(list: VideoDto[]): string | null {
  return (
    [...list]
      .filter((v) => v.thumbPath)
      .sort((a, b) => b.savedAt - a.savedAt)[0]?.id ?? null
  )
}

const allSavedCoverVideoId = computed(() => mostRecentCoverId(lib.videos))
const favoritesCoverVideoId = computed(() => mostRecentCoverId(lib.videos.filter((v) => v.favorite)))

const continueWatching = computed(() =>
  lib.videos
    .filter((v) => v.positionSec > 5 && v.durationSec && v.positionSec / v.durationSec < 0.95)
    .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
    .slice(0, 10)
)

const videoResults = computed(() => {
  const q = search.normalizedQuery
  if (!q) return []
  return lib.videos.filter(
    (v) => v.author?.toLowerCase().includes(q) || v.caption?.toLowerCase().includes(q) || v.notes?.toLowerCase().includes(q)
  )
})

const collectionResults = computed(() => {
  const q = search.normalizedQuery
  if (!q) return []
  return lib.collections.filter((c) => c.name.toLowerCase().includes(q))
})
</script>
