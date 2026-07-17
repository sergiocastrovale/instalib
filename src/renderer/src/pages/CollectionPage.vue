<template>
  <div class="flex flex-col gap-4">
    <Breadcrumbs :items="breadcrumbItems" />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-[31.2px] font-bold tracking-[-0.02em]">{{ title }}</h1>
        <p class="text-[15.6px] text-muted-foreground">{{ filtered.length }} video{{ filtered.length === 1 ? '' : 's' }}</p>
      </div>
      <div class="flex items-center gap-2">
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

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative max-w-xs flex-1">
        <SearchIcon class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input v-model="search.collectionFilter" placeholder="Filter this collection…" class="h-[38px] pl-8" />
      </div>
      <Select v-model="authorFilter">
        <SelectTrigger class="h-[38px] w-44"><SelectValue placeholder="All authors" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All authors</SelectItem>
          <SelectItem v-for="a in authors" :key="a" :value="a">{{ a }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="sortBy">
        <SelectTrigger class="h-[38px] w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="savedAt_desc">Newest saved</SelectItem>
          <SelectItem value="savedAt_asc">Oldest saved</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="i in 6" :key="i" class="h-20 rounded-lg" />
    </div>
    <div v-else-if="!filtered.length" class="py-16 text-center text-muted-foreground">No videos match.</div>
    <div v-else class="flex flex-col gap-1">
      <VideoRow v-for="v in filtered" :key="v.id" :video="v" :list-id="routeListId" :from="fromOrigin" />
    </div>

    <Dialog v-model:open="showRemoveCollectionConfirm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this collection? This will NOT remove the collection from
            Instagram, only from Instalib. You can add it back by re-syncing via zip file.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showRemoveCollectionConfirm = false">Cancel</Button>
          <Button variant="destructive" :disabled="removingCollection" @click="doRemoveCollection">
            <Loader2Icon v-if="removingCollection" class="size-4 animate-spin" />
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2Icon, MoreVerticalIcon, PlayIcon, SearchIcon, ShuffleIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import VideoRow from '@/components/VideoRow.vue'
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs.vue'
import { shuffleArray, useQueue } from '@/composables/useQueue'
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
const breadcrumbItems = computed<BreadcrumbItem[]>(() => [
  { label: fromOrigin.value === 'search' ? 'Search' : 'Home', to: '/' },
  { label: title.value }
])

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
    await window.api.collectionsDelete(currentCollection.value.id)
    showRemoveCollectionConfirm.value = false
    toast.success('Collection removed')
    await lib.refresh()
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
  const ids = filtered.value.map((v) => v.id)
  if (!ids.length) return
  const ordered = shuffle ? shuffleArray(ids) : ids
  queue.shuffleOn.value = shuffle
  queue.setQueue(routeListId.value, ordered)
  const fromQs = fromOrigin.value ? `&from=${fromOrigin.value}` : ''
  await router.push(`/watch/${ordered[0]}?list=${routeListId.value}${fromQs}`)
}
</script>
