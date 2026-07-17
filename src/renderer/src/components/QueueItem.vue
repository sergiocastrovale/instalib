<template>
  <RouterLink :to="href" class="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent" :class="{ 'bg-primary/15': active }">
    <div class="relative aspect-video w-[104px] shrink-0 overflow-hidden rounded border bg-muted">
      <img v-if="video.thumbPath" :src="`app-media://thumb/${video.id}`" class="h-full w-full object-cover" loading="lazy" />
      <div v-else class="flex h-full items-center justify-center"><VideoIcon class="size-4 text-muted-foreground" /></div>
      <div v-if="active" class="absolute inset-0 flex items-center justify-center bg-black/20">
        <PlayIcon class="size-5 fill-white text-white" />
      </div>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-xs font-medium" :class="{ 'text-primary': active }">{{ video.author ?? video.shortcode }}</p>
      <p class="truncate text-xs text-muted-foreground">{{ formatDate(video.savedAt) }}</p>
      <div class="flex items-center gap-1">
        <CheckCircle2Icon v-if="video.watched" class="size-3 text-emerald-500" />
        <p class="truncate font-mono text-xs text-muted-foreground">{{ video.durationSec ? formatDuration(video.durationSec) : '' }}</p>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2Icon, PlayIcon, VideoIcon } from '@lucide/vue'
import { formatDate, formatDuration } from '@/lib/format'
import type { VideoDto } from '@shared/types'

const props = defineProps<{ video: VideoDto; active?: boolean; listId?: string; from?: string }>()

const href = computed(() => {
  const params = new URLSearchParams()
  if (props.listId) params.set('list', props.listId)
  if (props.from) params.set('from', props.from)
  const qs = params.toString()
  return qs ? `/watch/${props.video.id}?${qs}` : `/watch/${props.video.id}`
})
</script>
