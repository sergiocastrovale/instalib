<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative max-w-xs flex-1">
      <SearchIcon class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input
        :model-value="search"
        placeholder="Filter this collection…"
        class="h-[38px] pl-8"
        @update:model-value="$emit('update:search', String($event))"
      />
    </div>
    <Select :model-value="authorFilter" @update:model-value="$emit('update:authorFilter', String($event))">
      <SelectTrigger class="h-[38px] w-44"><SelectValue placeholder="All authors" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All authors</SelectItem>
        <SelectItem v-for="a in authors" :key="a" :value="a">{{ a }}</SelectItem>
      </SelectContent>
    </Select>
    <Select :model-value="sortBy" @update:model-value="$emit('update:sortBy', String($event))">
      <SelectTrigger class="h-[38px] w-44"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="savedAt_desc">Newest saved</SelectItem>
        <SelectItem value="savedAt_asc">Oldest saved</SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

defineProps<{
  search: string
  authorFilter: string
  authors: string[]
  sortBy: string
}>()

defineEmits<{
  'update:search': [value: string]
  'update:authorFilter': [value: string]
  'update:sortBy': [value: string]
}>()
</script>
