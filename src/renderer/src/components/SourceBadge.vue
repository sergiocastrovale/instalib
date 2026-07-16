<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    :class="classes"
  >
    <component :is="icon" class="size-3" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CloudIcon, HardDriveIcon, FrameIcon } from '@lucide/vue'
import type { PlaybackSourceKind } from '@shared/types'

const props = defineProps<{ source: PlaybackSourceKind | null }>()

const label = computed(() => {
  if (props.source === 'local') return 'Offline'
  if (props.source === 'embed') return 'Embed'
  return 'Web'
})

const icon = computed(() => {
  if (props.source === 'local') return HardDriveIcon
  if (props.source === 'embed') return FrameIcon
  return CloudIcon
})

const classes = computed(() => {
  if (props.source === 'local') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (props.source === 'embed') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  return 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
})
</script>
