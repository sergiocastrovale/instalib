<template>
  <div class="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    <component
      :is="mode === 'navigate' ? RouterLink : 'button'"
      :to="mode === 'navigate' ? '/collection/all' : undefined"
      :type="mode === 'select' ? 'button' : undefined"
      class="group block w-full text-left"
      @click="mode === 'select' ? toggleAll() : undefined"
    >
      <div
        :class="cn(
          'relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted',
          mode === 'select' && allState === true && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
          allSavedFullyDownloaded && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background'
        )"
      >
        <img
          v-if="allSavedCoverVideoId"
          :src="`app-media://thumb/${allSavedCoverVideoId}`"
          class="h-full w-full object-cover transition group-hover:scale-105"
          loading="lazy"
        />
        <LibraryBigIcon v-else class="size-8 text-muted-foreground" />
        <div v-if="mode === 'select'" class="absolute left-2 top-2">
          <Checkbox :model-value="allState" tabindex="-1" class="pointer-events-none size-5" />
        </div>
      </div>
      <p class="mt-1.5 text-[15.6px] font-medium">All saved</p>
      <p class="font-mono text-[13.2px] text-muted-foreground">
        {{ allSavedCount ?? 0 }} videos
        <template v-if="mode === 'select'">/ {{ allSavedDownloadedCount ?? 0 }} downloaded</template>
      </p>
    </component>

    <CollectionCard
      v-if="mode === 'navigate'"
      :collection="favoritesCollection"
      mode="navigate"
    />

    <CollectionCard
      v-for="c in collections"
      :key="c.id"
      :collection="c"
      :mode="mode"
      :selected="selectedSet.has(c.id)"
      :downloaded-count="downloadedCounts[c.id] ?? 0"
      @update:selected="(v) => toggleOne(c.id, v)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LibraryBigIcon } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { CollectionDto } from '@shared/types'
import CollectionCard from './CollectionCard.vue'

const props = withDefaults(
  defineProps<{
    collections: CollectionDto[]
    mode?: 'navigate' | 'select'
    allSavedCount?: number
    favoritesCount?: number
    allSavedCoverVideoId?: string | null
    favoritesCoverVideoId?: string | null
    allSavedDownloadedCount?: number
    downloadedCounts?: Record<string, number>
    selectedIds?: string[]
    allSelected?: boolean
  }>(),
  {
    mode: 'navigate',
    allSavedCount: 0,
    favoritesCount: 0,
    allSavedCoverVideoId: null,
    favoritesCoverVideoId: null,
    allSavedDownloadedCount: 0,
    downloadedCounts: () => ({}),
    selectedIds: () => [],
    allSelected: false
  }
)

const emit = defineEmits<{ 'update:selectedIds': [value: string[]]; 'update:allSelected': [value: boolean] }>()

const favoritesCollection = computed<CollectionDto>(() => ({
  id: 'favorites',
  name: 'Favorites',
  kind: 'user',
  syncEnabled: false,
  videoCount: props.favoritesCount ?? 0,
  coverVideoId: props.favoritesCoverVideoId ?? null,
  createdAt: 0
}))

const selectedSet = computed(() => new Set(props.selectedIds))

function isFullyDownloaded(c: CollectionDto): boolean {
  return c.videoCount > 0 && (props.downloadedCounts[c.id] ?? 0) >= c.videoCount
}

const allSavedFullyDownloaded = computed(
  () => (props.allSavedCount ?? 0) > 0 && (props.allSavedDownloadedCount ?? 0) >= (props.allSavedCount ?? 0)
)

const eligibleCollections = computed(() => props.collections.filter((c) => !isFullyDownloaded(c)))

const allCollectionsSelected = computed(() =>
  eligibleCollections.value.length === 0 ? true : eligibleCollections.value.every((c) => selectedSet.value.has(c.id))
)
const allState = computed<boolean | 'indeterminate'>(() => {
  const fullyOn = allCollectionsSelected.value && props.allSelected
  const noneOn = props.selectedIds!.length === 0 && !props.allSelected
  if (fullyOn) return true
  if (noneOn) return false
  return 'indeterminate'
})

function toggleOne(id: string, selected: boolean): void {
  const next = new Set(selectedSet.value)
  if (selected) next.add(id)
  else next.delete(id)
  emit('update:selectedIds', [...next])
}

function toggleAll(): void {
  if (allState.value === true) {
    emit('update:selectedIds', [])
    emit('update:allSelected', false)
  } else {
    emit(
      'update:selectedIds',
      eligibleCollections.value.map((c) => c.id)
    )
    emit('update:allSelected', true)
  }
}
</script>
