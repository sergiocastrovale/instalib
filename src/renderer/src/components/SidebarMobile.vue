<template>
  <button
    class="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
    title="Open menu"
    @click="open = true"
  >
    <MenuIcon class="size-5" />
  </button>

  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-background" />
      <DialogContent class="fixed inset-0 z-50 flex flex-col bg-background outline-none">
        <DialogTitle class="sr-only">Navigation menu</DialogTitle>

        <DialogClose
          class="absolute top-3 right-3 flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon class="size-7" />
          <span class="sr-only">Close menu</span>
        </DialogClose>

        <div class="flex-1 overflow-y-auto">
          <div class="flex min-h-full flex-col items-center justify-center gap-10 px-6 py-20">
            <div class="flex items-center gap-3 text-3xl font-bold">
              <ClapperboardIcon class="size-9 text-primary" />
              Instalib
            </div>

            <div class="w-full max-w-sm">
              <SearchMobile @close="open = false" />
            </div>

            <nav class="flex flex-col items-center gap-6 text-lg">
              <RouterLink to="/" :class="itemClass(route.name === 'library')" @click="open = false">
                Home
              </RouterLink>
              <RouterLink
                to="/collection/favorites"
                :class="itemClass(isCollectionRoute('favorites'))"
                @click="open = false"
              >
                Favorites
              </RouterLink>
              <RouterLink to="/collection/all" :class="itemClass(isCollectionRoute('all'))" @click="open = false">
                All saved <span class="text-muted-foreground">{{ lib.totalVideoCount }}</span>
              </RouterLink>
              <RouterLink
                v-for="c in lib.collections"
                :key="c.id"
                :to="`/collection/${c.id}`"
                :class="itemClass(isCollectionRoute(c.id))"
                @click="open = false"
              >
                {{ c.name }} <span class="text-muted-foreground">{{ c.videoCount }}</span>
              </RouterLink>
            </nav>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { ClapperboardIcon, MenuIcon, XIcon } from '@lucide/vue'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import SearchMobile from '@/components/SearchMobile.vue'
import { useLibraryStore } from '@/stores/library'

const route = useRoute()
const lib = useLibraryStore()
const open = ref(false)

function isCollectionRoute(id: string): boolean {
  return route.name === 'collection' && route.params.id === id
}

function itemClass(active: boolean): string {
  return active ? 'font-medium text-primary' : 'text-foreground/80 hover:text-foreground'
}
</script>
