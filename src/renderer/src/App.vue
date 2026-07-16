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
        <header v-if="route.name !== 'setup'" class="shrink-0 bg-background/95 backdrop-blur">
          <div class="flex min-h-[88px] items-center gap-6 px-6">
            <div class="mt-6 flex flex-1 justify-center self-start">
              <div class="relative w-full max-w-2xl">
                <Input
                  v-model="search.query"
                  placeholder="Search for a video or collection"
                  class="h-14 rounded-full border-transparent bg-muted/50 pr-12 pl-6 text-base"
                />
                <SearchIcon class="absolute right-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div class="flex items-center gap-1 text-muted-foreground">
              <button
                class="flex size-9 items-center justify-center rounded-lg hover:bg-accent hover:text-foreground"
                title="Toggle theme"
                @click="toggleTheme"
              >
                <SunIcon v-if="currentTheme === 'dark'" class="size-5" />
                <MoonIcon v-else class="size-5" />
              </button>
              <RouterLink
                to="/settings"
                class="flex size-9 items-center justify-center rounded-lg hover:bg-accent hover:text-foreground"
                active-class="text-foreground"
                title="Settings"
              >
                <SettingsIcon class="size-5" />
              </RouterLink>
              <button
                class="flex size-9 items-center justify-center rounded-lg hover:bg-accent hover:text-foreground"
                title="GitHub"
                @click="openGithub"
              >
                <GithubIcon class="size-5" />
              </button>
            </div>
          </div>
        </header>
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
import { MoonIcon, SearchIcon, SettingsIcon, SunIcon } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { Toaster } from 'vue-sonner'
import { navigating, router } from './router'
import { Input } from '@/components/ui/input'
import PlayerDock from '@/components/player/PlayerDock.vue'
import TitleBar from '@/components/TitleBar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import GithubIcon from '@/components/icons/GithubIcon.vue'
import { useSearchStore } from '@/stores/search'
import { currentTheme, toggleTheme } from '@/lib/theme'

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
