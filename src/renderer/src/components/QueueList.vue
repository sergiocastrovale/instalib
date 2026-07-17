<template>
  <aside class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold">Up next</h2>
      <div class="flex items-center gap-1">
        <Button size="sm" variant="ghost" :class="{ 'text-primary': autoplay }" @click="$emit('update:autoplay', !autoplay)">
          Autoplay
        </Button>
        <Button size="icon" variant="ghost" :class="{ 'text-primary': shuffleOn }" @click="$emit('shuffle')">
          <ShuffleIcon class="size-4" />
        </Button>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <QueueItem v-for="qv in videos" :key="qv.id" :video="qv" :active="qv.id === activeId" :list-id="listId" :from="from" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ShuffleIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import QueueItem from './QueueItem.vue'
import type { VideoDto } from '@shared/types'

defineProps<{
  videos: VideoDto[]
  activeId?: string
  autoplay: boolean
  shuffleOn: boolean
  listId?: string
  from?: string
}>()

defineEmits<{ 'update:autoplay': [value: boolean]; shuffle: [] }>()
</script>
