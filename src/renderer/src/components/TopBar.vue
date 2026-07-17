<template>
  <header class="shrink-0 bg-background/95 backdrop-blur">
    <div class="relative flex min-h-[88px] items-center px-6">
      <div class="absolute left-1/2 top-6 w-full max-w-2xl -translate-x-1/2">
        <div class="relative">
          <Input
            v-model="search.query"
            placeholder="Search for a video or collection"
            class="h-14 rounded-full border-transparent bg-muted/50 pr-12 pl-6 text-base focus-visible:border-transparent focus-visible:ring-0"
          />
          <SearchIcon class="absolute right-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <div class="ml-auto flex items-center gap-1 text-muted-foreground">
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
</template>

<script setup lang="ts">
import { MoonIcon, SearchIcon, SettingsIcon, SunIcon } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import GithubIcon from '@/components/icons/GithubIcon.vue'
import { useSearchStore } from '@/stores/search'
import { currentTheme, toggleTheme } from '@/lib/theme'

const search = useSearchStore()

async function openGithub(): Promise<void> {
  await window.api.shellOpenExternal('https://github.com/sergiocastrovale')
}
</script>
