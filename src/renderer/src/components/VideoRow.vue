<template>
  <RouterLink :to="href" class="group flex items-center gap-3.5 rounded-lg p-2.5 hover:bg-accent">
    <div class="relative aspect-video w-40 shrink-0 overflow-hidden rounded-md border bg-muted">
      <img
        v-if="video.thumbPath"
        :src="`app-media://thumb/${video.id}`"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center">
        <VideoIcon class="size-6 text-muted-foreground" />
      </div>
      <span v-if="video.durationSec" class="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[12px] text-white">
        {{ formatDuration(video.durationSec) }}
      </span>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium">{{ video.author ?? video.shortcode }}</p>
      <p class="truncate text-xs text-muted-foreground">{{ video.caption || 'No caption' }}</p>
      <p class="mt-0.5 text-xs text-muted-foreground">Saved {{ formatDate(video.savedAt) }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-1.5">
      <SourceBadge :source="video.filePath ? 'local' : 'web'" />
      <CheckCircle2Icon v-if="video.watched" class="size-4 text-emerald-500" />
      <HeartIcon v-if="video.favorite" class="size-4 text-destructive" fill="currentColor" />
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2Icon, HeartIcon, VideoIcon } from '@lucide/vue'
import { formatDate, formatDuration } from '@/lib/format'
import type { VideoDto } from '@shared/types'
import SourceBadge from './SourceBadge.vue'

const props = defineProps<{ video: VideoDto; listId?: string; from?: string }>()

const href = computed(() => {
  const params = new URLSearchParams()
  if (props.listId) params.set('list', props.listId)
  if (props.from) params.set('from', props.from)
  const qs = params.toString()
  return qs ? `/watch/${props.video.id}?${qs}` : `/watch/${props.video.id}`
})
</script>
