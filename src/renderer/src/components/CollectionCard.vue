<template>
  <component
    :is="mode === 'navigate' ? RouterLink : 'button'"
    :to="mode === 'navigate' ? href : undefined"
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
        v-if="collection.coverVideoId"
        :src="`app-media://thumb/${collection.coverVideoId}`"
        class="h-full w-full object-cover transition group-hover:scale-105"
        loading="lazy"
      />
      <HeartIcon v-else-if="collection.id === 'favorites'" class="size-8 text-muted-foreground" />
      <FolderIcon v-else class="size-8 text-muted-foreground" />

      <div v-if="mode === 'select'" class="absolute left-2 top-2">
        <Checkbox :model-value="selected" tabindex="-1" class="pointer-events-none size-5" />
      </div>
    </div>
    <p class="mt-1.5 truncate text-[15.6px] font-medium">{{ collection.name }}</p>
    <p class="font-mono text-[13.2px] text-muted-foreground">{{ collection.videoCount }} videos</p>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FolderIcon, HeartIcon } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { CollectionDto } from '@shared/types'

const props = withDefaults(
  defineProps<{ collection: CollectionDto; mode?: 'navigate' | 'select'; selected?: boolean; from?: string }>(),
  {
    mode: 'navigate',
    selected: false
  }
)

const emit = defineEmits<{ 'update:selected': [value: boolean] }>()

const href = computed(() => (props.from ? `/collection/${props.collection.id}?from=${props.from}` : `/collection/${props.collection.id}`))
</script>
