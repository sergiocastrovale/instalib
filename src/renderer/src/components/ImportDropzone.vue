<template>
  <label
    class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors"
    :class="isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <Loader2Icon v-if="importing" class="size-8 animate-spin text-muted-foreground" />
    <UploadIcon v-else class="size-8 text-muted-foreground" />
    <p class="text-sm">
      <span class="font-medium text-foreground">Click to choose</span> or drag your export .zip here
    </p>
    <input type="file" accept=".zip,application/zip,application/json" class="hidden" :disabled="importing" @change="onFileInput" />
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loader2Icon, UploadIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ImportResult } from '@shared/types'

const emit = defineEmits<{ imported: [result: ImportResult] }>()

const isDragging = ref(false)
const importing = ref(false)

async function handleFile(file: File): Promise<void> {
  importing.value = true
  try {
    const path = window.api.getPathForFile(file)
    const result = await window.api.importZip(path)
    toast.success(`Imported ${result.imported} new video${result.imported === 1 ? '' : 's'}, updated ${result.updated}`)
    emit('imported', result)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Import failed')
  } finally {
    importing.value = false
  }
}

function onDrop(e: DragEvent): void {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onFileInput(e: Event): void {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) handleFile(file)
  target.value = ''
}
</script>
