<template>
  <section>
    <h2 class="mb-3 text-[22.8px] font-semibold">Results for "{{ query }}"</h2>

    <div v-if="!collections.length && !videos.length" class="text-sm text-muted-foreground">
      No matches.
    </div>

    <div v-if="collections.length" class="mb-6">
      <h3 class="mb-2 text-sm font-semibold text-muted-foreground">Collections ({{ collections.length }})</h3>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <CollectionCard v-for="c in collections" :key="c.id" :collection="c" from="search" />
      </div>
    </div>

    <div v-if="videos.length">
      <h3 class="mb-2 text-sm font-semibold text-muted-foreground">Videos ({{ videos.length }})</h3>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <VideoCard v-for="v in videos" :key="v.id" :video="v" list-id="all" from="search" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import CollectionCard from '@/components/CollectionCard.vue'
import VideoCard from '@/components/VideoCard.vue'
import type { CollectionDto, VideoDto } from '@shared/types'

defineProps<{ query: string; collections: CollectionDto[]; videos: VideoDto[] }>()
</script>
