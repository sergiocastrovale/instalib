<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold">Notes</h2>
      <span class="text-xs text-muted-foreground">{{ saving ? 'Saving…' : saved ? 'Saved' : '' }}</span>
    </div>
    <textarea
      v-model="text"
      rows="6"
      placeholder="Notes for this tutorial — chords, timestamps, technique cues…"
      class="w-full resize-y rounded-lg border bg-transparent p-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      @input="onInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ save: [value: string] }>()

const text = ref(props.modelValue)
const saving = ref(false)
const saved = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function flushPending(): void {
  if (!debounceTimer) return
  clearTimeout(debounceTimer)
  debounceTimer = null
  emit('save', text.value)
  saving.value = false
  saved.value = true
}

watch(
  () => props.modelValue,
  (v) => {
    flushPending()
    if (v !== text.value) text.value = v
  }
)

onBeforeUnmount(flushPending)

function onInput(): void {
  saved.value = false
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    saving.value = true
    emit('save', text.value)
    saving.value = false
    saved.value = true
  }, 800)
}
</script>
