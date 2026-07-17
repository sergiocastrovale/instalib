<template>
  <div class="relative w-full">
    <Input
      v-model="local"
      placeholder="Search for a video or collection"
      class="h-14 rounded-full border-transparent bg-muted/50 pr-12 pl-6 text-base focus-visible:border-transparent focus-visible:ring-0"
      @keyup.enter="onEnter"
    />
    <SearchIcon class="absolute right-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SearchIcon } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { useSearch } from '@/composables/useSearch'

const emit = defineEmits<{ close: [] }>()

const { store, submit } = useSearch()

// Local model so typing does NOT touch the store or navigate; only Enter commits.
const local = ref(store.query)

function onEnter(): void {
  submit(local.value)
  emit('close')
}
</script>
