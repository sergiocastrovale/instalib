<template>
  <div class="flex flex-col gap-4">
    <Breadcrumbs :items="breadcrumbItems" />

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div>
        <h1 class="text-[31.2px] font-bold tracking-[-0.02em]">{{ title }}</h1>
        <p class="text-[15.6px] text-muted-foreground">{{ filtered.length }} video{{ filtered.length === 1 ? '' : 's' }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button :disabled="!filtered.length" @click="playAll(false)">
          <PlayIcon class="size-4" /> Play all
        </Button>
        <Button variant="outline" :disabled="!filtered.length" @click="playAll(true)">
          <ShuffleIcon class="size-4" /> Shuffle
        </Button>
        <DropdownMenu v-if="currentCollection?.kind === 'imported'">
          <DropdownMenuTrigger as-child>
            <Button size="icon" variant="ghost"><MoreVerticalIcon class="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem class="text-destructive" @click="showRemoveCollectionConfirm = true">
              Remove from app
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <CollectionFilterBar
      v-model:search="search.collectionFilter"
      v-model:author-filter="authorFilter"
      v-model:sort-by="sortBy"
      :authors="authors"
    />

    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="i in 6" :key="i" class="h-20 rounded-lg" />
    </div>
    <div v-else-if="!filtered.length" class="py-16 text-center text-muted-foreground">No videos match.</div>
    <div v-else class="flex flex-col gap-1">
      <VideoRow v-for="v in filtered" :key="v.id" :video="v" :list-id="routeListId" :from="fromOrigin" />
    </div>

    <ConfirmDialog
      v-model:open="showRemoveCollectionConfirm"
      title="Are you sure?"
      description="Are you sure you want to remove this collection? This will NOT remove the collection from Instagram, only from Instalib. You can add it back by re-syncing via zip file."
      confirm-label="Remove"
      :loading="removingCollection"
      @confirm="doRemoveCollection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MoreVerticalIcon, PlayIcon, ShuffleIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import VideoRow from '@/components/VideoRow.vue'
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CollectionFilterBar from '@/components/CollectionFilterBar.vue'
import { useQueue } from '@/composables/useQueue'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { useSearchStore } from '@/stores/search'
import { useLibraryStore } from '@/stores/library'
import { router } from '@/router'
import { listQuery } from '@/lib/listQuery'
import { useVideoFilters } from '@/composables/useVideoFilters'
import type { CollectionDto, VideoDto } from '@shared/types'

const route = useRoute()
const routeListId = computed(() => route.params.id as string)
const search = useSearchStore()
const lib = useLibraryStore()

const fromOrigin = computed<string | undefined>(() => (route.query.from === 'search' ? 'search' : undefined))
const { root } = useBreadcrumbs(fromOrigin)
const breadcrumbItems = computed<BreadcrumbItem[]>(() => [root.value, { label: title.value }])

const videos = ref<VideoDto[]>([])
const collections = ref<CollectionDto[]>([])
const loading = ref(true)

async function load(): Promise<void> {
  loading.value = true
  const [v, c] = await Promise.all([window.api.videosList(listQuery(routeListId.value)), window.api.collectionsList()])
  videos.value = v
  collections.value = c
  loading.value = false
}

onMounted(load)
watch(routeListId, () => {
  search.setCollectionFilter('')
  load()
})

const currentCollection = computed(() => collections.value.find((c) => c.id === routeListId.value))

const title = computed(() => {
  if (routeListId.value === 'all') return 'All saved'
  if (routeListId.value === 'favorites') return 'Favorites'
  return currentCollection.value?.name ?? 'Collection'
})

const showRemoveCollectionConfirm = ref(false)
const removingCollection = ref(false)

async function doRemoveCollection(): Promise<void> {
  if (!currentCollection.value) return
  removingCollection.value = true
  try {
    await lib.deleteCollection(currentCollection.value.id)
    showRemoveCollectionConfirm.value = false
    toast.success('Collection removed')
    await router.push('/')
  } catch {
    toast.error('Failed to remove collection')
  } finally {
    removingCollection.value = false
  }
}

const { authorFilter, sortBy, authors, filtered } = useVideoFilters(
  videos,
  computed(() => search.collectionFilter)
)

const queue = useQueue()
async function playAll(shuffle: boolean): Promise<void> {
  await queue.playAll(
    routeListId.value,
    filtered.value.map((v) => v.id),
    shuffle,
    fromOrigin.value
  )
}
</script>
