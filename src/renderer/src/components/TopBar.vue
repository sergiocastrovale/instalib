<template>
  <header class="shrink-0 bg-background/95 backdrop-blur">
    <div class="flex min-h-[88px] items-center gap-4 px-6">
      <SidebarMobile />
      <div class="hidden min-w-0 flex-1 lg:block">
        <div class="mx-auto w-full max-w-2xl">
          <Search />
        </div>
      </div>
      <div class="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground">
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
import { MoonIcon, SettingsIcon, SunIcon } from '@lucide/vue'
import GithubIcon from '@/components/icons/GithubIcon.vue'
import SidebarMobile from '@/components/SidebarMobile.vue'
import Search from '@/components/Search.vue'
import { currentTheme, toggleTheme } from '@/lib/theme'

async function openGithub(): Promise<void> {
  await window.api.shellOpenExternal('https://github.com/sergiocastrovale/instalib')
}
</script>
