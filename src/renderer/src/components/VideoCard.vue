<template>
  <RouterLink :to="href" class="group block">
    <div class="relative aspect-video overflow-hidden rounded-lg border bg-muted">
      <img
        v-if="video.thumbPath"
        :src="`app-media://thumb/${video.id}`"
        class="h-full w-full object-cover transition group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center">
        <VideoIcon class="size-8 text-muted-foreground" />
      </div>
      <div v-if="variant === 'resume'" class="absolute inset-0 flex items-center justify-center">
        <div class="flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
          <PlayIcon class="size-5 fill-white text-white" />
        </div>
      </div>
      <span
        v-if="variant === 'resume' && video.durationSec"
        class="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[12.6px] text-white"
      >
        {{ formatDuration(video.positionSec) }} / {{ formatDuration(video.durationSec) }}
      </span>
      <span
        v-else-if="video.durationSec"
        class="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[12px] text-white"
      >
        {{ formatDuration(video.durationSec) }}
      </span>
      <div
        v-if="progressPct > 3"
        :class="variant === 'resume' ? 'absolute inset-x-0 bottom-0 h-1 bg-white/30' : 'absolute inset-x-0 bottom-0 h-0.5 bg-white/30'"
      >
        <div class="h-full bg-primary" :style="{ width: progressPct + '%' }" />
      </div>
      <CheckCircle2Icon v-if="video.watched" class="absolute top-1.5 right-1.5 size-5 rounded-full bg-emerald-500/90 p-0.5 text-white" />
      <div class="absolute bottom-1 left-1">
        <SourceBadge :source="video.filePath ? 'local' : 'web'" />
      </div>
    </div>
    <p class="mt-1.5 truncate text-sm font-medium">{{ video.author ?? video.shortcode }}</p>
    <p class="truncate text-xs text-muted-foreground">{{ video.caption || 'No caption' }}</p>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2Icon, PlayIcon, VideoIcon } from '@lucide/vue'
import { formatDuration } from '@/lib/format'
import type { VideoDto } from '@shared/types'
import SourceBadge from './SourceBadge.vue'

const props = withDefaults(
  defineProps<{ video: VideoDto; listId?: string; variant?: 'default' | 'resume'; from?: string }>(),
  { variant: 'default' }
)

const href = computed(() => {
  const params = new URLSearchParams()
  if (props.listId) params.set('list', props.listId)
  if (props.from) params.set('from', props.from)
  const qs = params.toString()
  return qs ? `/watch/${props.video.id}?${qs}` : `/watch/${props.video.id}`
})

const progressPct = computed(() => {
  if (!props.video.durationSec) return 0
  const pct = (props.video.positionSec / props.video.durationSec) * 100
  return pct < 95 ? Math.min(100, pct) : 0
})
</script>
