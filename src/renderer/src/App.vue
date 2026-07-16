<template>
  <div class="min-h-svh bg-background text-foreground">
    <div v-if="navigating" class="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-primary/20">
      <div class="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] bg-primary" />
    </div>
    <div class="sticky top-0 z-50">
      <TitleBar />
      <header v-if="route.name !== 'setup'" class="bg-background/95 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4">
          <RouterLink to="/" class="flex items-center gap-2 font-semibold">
            <ClapperboardIcon class="size-5" />
            Instalib
          </RouterLink>
          <div class="flex flex-1 justify-center">
            <div class="relative w-full max-w-xl">
              <Input
                v-model="search.query"
                placeholder="Search for a video or collection"
                class="h-11 rounded-full border-transparent bg-muted/50 pr-11 pl-5"
              />
              <SearchIcon class="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div class="flex items-center gap-3 text-muted-foreground">
            <RouterLink to="/settings" class="hover:text-foreground" active-class="text-foreground" title="Settings">
              <SettingsIcon class="size-5" />
            </RouterLink>
            <button class="hover:text-foreground" title="GitHub" @click="openGithub">
              <GithubIcon class="size-5" />
            </button>
          </div>
        </div>
      </header>
    </div>
    <main :class="route.name === 'setup' ? '' : 'mx-auto max-w-[1600px] px-4 py-6'">
      <RouterView />
    </main>
    <PlayerDock />
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { ClapperboardIcon, SearchIcon, SettingsIcon } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { Toaster } from 'vue-sonner'
import { navigating, router } from './router'
import { Input } from '@/components/ui/input'
import PlayerDock from '@/components/player/PlayerDock.vue'
import TitleBar from '@/components/TitleBar.vue'
import GithubIcon from '@/components/icons/GithubIcon.vue'
import { useSearchStore } from '@/stores/search'

const route = useRoute()
const search = useSearchStore()

watch(
  () => search.query,
  (q) => {
    if (q.trim() && route.name !== 'library') router.push('/')
  }
)

async function openGithub(): Promise<void> {
  await window.api.shellOpenExternal('https://github.com/sergiocastrovale')
}
</script>
