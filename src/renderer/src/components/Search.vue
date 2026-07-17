<template>
  <div class="relative w-full">
    <Input
      :model-value="query"
      placeholder="Search for a video or collection"
      class="h-14 rounded-full border-transparent bg-muted/50 pr-12 pl-6 text-base focus-visible:border-transparent focus-visible:ring-0"
      @update:model-value="(v) => submit(String(v))"
    />
    <SearchIcon class="absolute right-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
  </div>
</template>

<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { useSearch } from '@/composables/useSearch'

const { query, submit } = useSearch()
</script>
