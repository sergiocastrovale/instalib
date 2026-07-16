<template>
  <component
    :is="mode === 'navigate' ? RouterLink : 'button'"
    :to="mode === 'navigate' ? `/playlist/${playlist.id}` : undefined"
    :type="mode === 'select' ? 'button' : undefined"
    class="group block w-full cursor-pointer text-left"
    @click="mode === 'select' ? emit('update:selected', !selected) : undefined"
  >
    <div
      :class="cn(
        'relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted',
        mode === 'select' && selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )"
    >
      <img
        v-if="playlist.coverVideoId"
        :src="`app-media://thumb/${playlist.coverVideoId}`"
        class="h-full w-full object-cover transition group-hover:scale-105"
        loading="lazy"
      />
      <HeartIcon v-else-if="playlist.id === 'favorites'" class="size-8 text-muted-foreground" />
      <FolderIcon v-else class="size-8 text-muted-foreground" />

      <div
        v-if="mode === 'select'"
        class="absolute left-1.5 top-1.5 rounded-md bg-background/80 p-0.5 shadow-sm backdrop-blur-sm"
      >
        <Checkbox :model-value="selected" tabindex="-1" class="pointer-events-none" />
      </div>
    </div>
    <p class="mt-1.5 truncate text-sm font-medium">{{ playlist.name }}</p>
    <p class="text-xs text-muted-foreground">{{ playlist.videoCount }} videos</p>
  </component>
</template>

<script setup lang="ts">
import { FolderIcon, HeartIcon } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { PlaylistDto } from '@shared/types'

withDefaults(defineProps<{ playlist: PlaylistDto; mode?: 'navigate' | 'select'; selected?: boolean }>(), {
  mode: 'navigate',
  selected: false
})

const emit = defineEmits<{ 'update:selected': [value: boolean] }>()
</script>
