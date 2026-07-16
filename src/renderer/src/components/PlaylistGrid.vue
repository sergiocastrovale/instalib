<template>
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    <component
      :is="mode === 'navigate' ? RouterLink : 'button'"
      :to="mode === 'navigate' ? '/playlist/all' : undefined"
      :type="mode === 'select' ? 'button' : undefined"
      class="group block w-full text-left"
      @click="mode === 'select' ? toggleAll() : undefined"
    >
      <div
        :class="cn(
          'relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted',
          mode === 'select' && allState === true && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )"
      >
        <img
          v-if="allSavedCoverVideoId"
          :src="`app-media://thumb/${allSavedCoverVideoId}`"
          class="h-full w-full object-cover transition group-hover:scale-105"
          loading="lazy"
        />
        <LibraryBigIcon v-else class="size-8 text-muted-foreground" />
        <div
          v-if="mode === 'select'"
          class="absolute left-1.5 top-1.5 rounded-md bg-background/80 p-0.5 shadow-sm backdrop-blur-sm"
        >
          <Checkbox :model-value="allState" tabindex="-1" class="pointer-events-none" />
        </div>
      </div>
      <p class="mt-1.5 text-sm font-medium">All saved</p>
      <p class="text-xs text-muted-foreground">{{ allSavedCount ?? 0 }} videos</p>
    </component>

    <PlaylistCard
      v-if="mode === 'navigate'"
      :playlist="favoritesPlaylist"
      mode="navigate"
    />

    <PlaylistCard
      v-for="p in playlists"
      :key="p.id"
      :playlist="p"
      :mode="mode"
      :selected="selectedSet.has(p.id)"
      @update:selected="(v) => toggleOne(p.id, v)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LibraryBigIcon } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { PlaylistDto } from '@shared/types'
import PlaylistCard from './PlaylistCard.vue'

const props = withDefaults(
  defineProps<{
    playlists: PlaylistDto[]
    mode?: 'navigate' | 'select'
    allSavedCount?: number
    favoritesCount?: number
    allSavedCoverVideoId?: string | null
    favoritesCoverVideoId?: string | null
    selectedIds?: string[]
    allSelected?: boolean
  }>(),
  {
    mode: 'navigate',
    allSavedCount: 0,
    favoritesCount: 0,
    allSavedCoverVideoId: null,
    favoritesCoverVideoId: null,
    selectedIds: () => [],
    allSelected: false
  }
)

const emit = defineEmits<{ 'update:selectedIds': [value: string[]]; 'update:allSelected': [value: boolean] }>()

const favoritesPlaylist = computed<PlaylistDto>(() => ({
  id: 'favorites',
  name: 'Favorites',
  kind: 'user',
  syncEnabled: false,
  videoCount: props.favoritesCount ?? 0,
  coverVideoId: props.favoritesCoverVideoId ?? null,
  createdAt: 0
}))

const selectedSet = computed(() => new Set(props.selectedIds))

const allCollectionsSelected = computed(
  () => props.playlists.length > 0 && props.playlists.every((p) => selectedSet.value.has(p.id))
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
      props.playlists.map((p) => p.id)
    )
    emit('update:allSelected', true)
  }
}
</script>
