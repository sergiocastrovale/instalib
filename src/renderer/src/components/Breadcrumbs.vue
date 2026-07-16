<template>
  <nav class="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground/70">
    <template v-for="(item, i) in items" :key="i">
      <RouterLink
        v-if="item.to && i < items.length - 1"
        :to="item.to"
        class="truncate transition-colors hover:text-foreground"
      >
        {{ item.label }}
      </RouterLink>
      <span v-else class="truncate">{{ item.label }}</span>
      <ChevronRightIcon v-if="i < items.length - 1" class="size-3.5 shrink-0" />
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ChevronRightIcon } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'

export interface BreadcrumbItem {
  label: string
  to?: RouteLocationRaw
}

defineProps<{ items: BreadcrumbItem[] }>()
</script>
