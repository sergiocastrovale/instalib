<template>
  <div class="flex aspect-video flex-col bg-black">
    <iframe
      :src="url"
      class="min-h-0 flex-1 w-full border-0"
      allow="autoplay; encrypted-media"
      allowfullscreen
    />
    <div class="flex items-center gap-2 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
      <TriangleAlertIcon class="size-3.5 shrink-0" />
      <span class="flex-1">Playing via Instagram embed - speed, loop, and resume are unavailable.</span>
      <Button size="sm" variant="ghost" class="h-6 px-2 text-xs" @click="$emit('retry')">Retry direct playback</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TriangleAlertIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineProps<{ url: string }>()
defineEmits<{ retry: [] }>()
</script>
