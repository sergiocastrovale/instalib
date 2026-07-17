<template>
  <div class="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
    <ClapperboardIcon class="size-10 text-muted-foreground" />
    <div>
      <h1 class="text-xl font-semibold">Setting up Instalib</h1>
      <p class="text-sm text-muted-foreground">
        Downloading yt-dlp and ffmpeg - needed to play and download your saved Instagram videos.
      </p>
    </div>

    <div class="w-full space-y-4">
      <div class="space-y-1.5 text-left">
        <div class="flex items-center justify-between text-sm">
          <span>yt-dlp</span>
          <span class="text-muted-foreground">{{ ytDlpPct }}%</span>
        </div>
        <Progress :model-value="ytDlpPct" />
      </div>
      <div class="space-y-1.5 text-left">
        <div class="flex items-center justify-between text-sm">
          <span>ffmpeg</span>
          <span class="text-muted-foreground">{{ ffmpegPct }}%</span>
        </div>
        <Progress :model-value="ffmpegPct" />
      </div>
    </div>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
    <Button v-if="error" variant="outline" @click="run">Retry</Button>
  </div>
</template>

<script setup lang="ts">
import { ClapperboardIcon } from '@lucide/vue'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useSetupInstall } from '@/composables/useSetupInstall'

const { ytDlpPct, ffmpegPct, error, run } = useSetupInstall()
</script>
