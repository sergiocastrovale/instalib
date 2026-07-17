<template>
  <aside
    :class="
      cn(
        'hidden shrink-0 flex-col overflow-hidden border-r bg-rail py-3.5 transition-[width] duration-150 ease-linear lg:flex',
        lib.sidebarCollapsed ? 'w-[60px] px-2.5' : 'w-[216px] px-3'
      )
    "
  >
    <div
      :class="
        cn(
          'mb-2 flex shrink-0',
          lib.sidebarCollapsed ? 'flex-col items-center gap-2' : 'flex-row items-center justify-between'
        )
      "
    >
      <RouterLink
        to="/"
        :class="cn('flex h-9 items-center gap-2 rounded-lg px-2.5 font-semibold', lib.sidebarCollapsed && 'px-0')"
      >
        <ClapperboardIcon class="size-5 shrink-0 text-primary" />
        <span v-if="!lib.sidebarCollapsed" class="truncate">Instalib</span>
      </RouterLink>

      <button
        class="flex size-[30px] shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        :title="lib.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="lib.toggleSidebar()"
      >
        <ChevronLeftIcon v-if="!lib.sidebarCollapsed" class="size-4" />
        <ChevronRightIcon v-else class="size-4" />
      </button>
    </div>

    <nav class="flex min-h-0 flex-1 flex-col gap-0.5">
      <RouterLink to="/" :class="itemClass(route.name === 'library')">
        <HomeIcon class="size-[17px] shrink-0" />
        <span v-if="!lib.sidebarCollapsed" class="truncate">Home</span>
      </RouterLink>
      <RouterLink to="/collection/favorites" :class="itemClass(isCollectionRoute('favorites'))">
        <HeartIcon class="size-[17px] shrink-0" />
        <span v-if="!lib.sidebarCollapsed" class="truncate">Favorites</span>
      </RouterLink>

      <p
        v-if="!lib.sidebarCollapsed"
        class="mt-3 mb-1 px-2.5 font-mono text-[12px] tracking-[0.06em] text-muted-foreground/65"
      >
        COLLECTIONS
      </p>
      <div v-else class="my-2 border-t border-border" />

      <RouterLink to="/collection/all" :class="itemClass(isCollectionRoute('all'))">
        <LayersIcon class="size-[17px] shrink-0" />
        <template v-if="!lib.sidebarCollapsed">
          <span class="flex-1 truncate">All saved</span>
          <span class="font-mono text-[13.2px] text-muted-foreground">{{ lib.totalVideoCount }}</span>
        </template>
      </RouterLink>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <RouterLink
          v-for="c in lib.collections"
          :key="c.id"
          :to="`/collection/${c.id}`"
          :class="itemClass(isCollectionRoute(c.id))"
        >
          <template v-if="lib.sidebarCollapsed">
            <span class="flex w-full items-center justify-center font-mono text-[13.2px]">
              {{ c.name.charAt(0).toUpperCase() }}
            </span>
          </template>
          <template v-else>
            <span class="flex-1 truncate">{{ c.name }}</span>
            <span class="font-mono text-[13.2px] text-muted-foreground">{{ c.videoCount }}</span>
          </template>
        </RouterLink>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronLeftIcon, ChevronRightIcon, ClapperboardIcon, HeartIcon, HomeIcon, LayersIcon } from '@lucide/vue'
import { useLibraryStore } from '@/stores/library'
import { cn } from '@/lib/utils'

const route = useRoute()
const lib = useLibraryStore()

onMounted(() => {
  if (!lib.loaded) lib.refresh()
})

function isCollectionRoute(id: string): boolean {
  return route.name === 'collection' && route.params.id === id
}

function itemClass(active: boolean): string {
  return cn(
    'flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[15.6px]',
    active ? 'bg-primary/15 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  )
}
</script>
