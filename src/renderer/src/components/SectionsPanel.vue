<template>
  <div class="flex flex-col gap-3">
    <h2 class="text-sm font-semibold">Sections</h2>

    <div v-if="activeSection" class="flex items-center gap-2 rounded-lg bg-primary/15 px-3 py-2 text-sm text-primary">
      <RepeatIcon class="size-4 shrink-0" />
      <span class="min-w-0 flex-1 truncate">Looping {{ activeSection.name }}</span>
      <span class="shrink-0 font-mono text-xs">Rep {{ repCount + 1 }} · {{ speed.toFixed(2) }}x</span>
      <button class="shrink-0 cursor-pointer" @click="$emit('stop-looping')">
        <XIcon class="size-4" />
      </button>
    </div>

    <div class="flex flex-col gap-[3px]">
      <div
        v-for="(sec, i) in sections"
        :key="sec.id"
        class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent"
        :class="{ 'bg-primary/15': sec.id === activeId }"
        @click="$emit('play', sec)"
      >
        <span class="size-[9px] shrink-0 rounded-[2px]" :style="{ background: sectionColor(i) }" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium">{{ sec.name }}</p>
          <p class="font-mono text-[10.5px] text-muted-foreground">
            {{ formatDuration(sec.start) }} – {{ formatDuration(sec.end) }}
          </p>
          <div v-if="sec.countInSec || sec.ramp" class="flex gap-1.5 font-mono text-[10.5px] text-muted-foreground">
            <span v-if="sec.countInSec" class="flex items-center gap-0.5">
              <TimerIcon class="size-3" />{{ sec.countInSec }}s
            </span>
            <span v-if="sec.ramp" class="flex items-center gap-0.5">
              <GaugeIcon class="size-3" />{{ sec.ramp.startAt }}→{{ sec.ramp.endAt }}x
            </span>
          </div>
        </div>
        <Button size="icon" variant="ghost" class="size-[26px]" @click.stop="$emit('edit', sec)">
          <PencilIcon class="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost" class="size-[26px]" @click.stop="$emit('delete', sec.id)">
          <Trash2Icon class="size-3.5" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GaugeIcon, PencilIcon, RepeatIcon, TimerIcon, Trash2Icon, XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/format'
import { sectionColor } from '@/lib/sections'
import type { VideoSection } from '@shared/types'

const props = defineProps<{
  sections: VideoSection[]
  activeId: string | null
  repCount: number
  speed: number
}>()

defineEmits<{
  play: [sec: VideoSection]
  edit: [sec: VideoSection]
  delete: [id: string]
  'stop-looping': []
}>()

const activeSection = computed(() => props.sections.find((s) => s.id === props.activeId) ?? null)
</script>
