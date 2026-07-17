<template>
  <div class="flex flex-col gap-8">

    <div v-if="lib.loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <Skeleton v-for="i in 10" :key="i" class="aspect-video rounded-lg" />
    </div>

    <template v-else-if="search.hasQuery">
      <SearchResults :query="search.query" :collections="collectionResults" :videos="videoResults" />
    </template>

    <template v-else>
      <section v-if="lib.continueWatching.length">
        <h2 class="mb-3 text-[25.2px] font-bold tracking-[-0.01em]">Jump back in</h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <VideoCard v-for="v in lib.continueWatching" :key="v.id" :video="v" list-id="all" variant="resume" from="home" />
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
          :all-saved-cover-video-id="lib.allSavedCoverVideoId"
          :favorites-cover-video-id="lib.favoritesCoverVideoId"
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
import CollectionGrid from '@/components/CollectionGrid.vue'
import ImportDropzone from '@/components/ImportDropzone.vue'
import SearchResults from '@/components/SearchResults.vue'
import { useSearchStore } from '@/stores/search'
import { useLibraryStore } from '@/stores/library'

const search = useSearchStore()
const lib = useLibraryStore()

onMounted(() => {
  if (!lib.loaded) lib.refresh()
})

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
