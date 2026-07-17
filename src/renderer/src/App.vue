<template>
  <div class="flex h-svh flex-col overflow-hidden bg-background text-foreground">
    <div v-if="navigating" class="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-primary/20">
      <div class="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] bg-primary" />
    </div>
    <div class="shrink-0">
      <TitleBar />
    </div>
    <div class="flex min-h-0 flex-1">
      <AppSidebar v-if="route.name !== 'setup'" />
      <div class="flex min-h-0 flex-1 flex-col">
        <TopBar v-if="route.name !== 'setup'" />
        <div class="flex-1 overflow-y-auto">
          <main
            :class="route.name === 'setup' ? '' : 'mx-auto max-w-[1400px] px-[30px] pt-[26px] pb-[60px]'"
          >
            <RouterView />
          </main>
        </div>
      </div>
    </div>
    <PlayerDock />
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { Toaster } from 'vue-sonner'
import { navigating, router } from './router'
import PlayerDock from '@/components/player/PlayerDock.vue'
import TitleBar from '@/components/TitleBar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import TopBar from '@/components/TopBar.vue'
import { useSearchStore } from '@/stores/search'

const route = useRoute()
const search = useSearchStore()

watch(
  () => search.query,
  (q) => {
    if (q.trim() && route.name !== 'library') router.push('/')
  }
)
</script>
