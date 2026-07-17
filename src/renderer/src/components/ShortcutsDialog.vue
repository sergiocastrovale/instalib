<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent>
      <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
      <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        <template v-for="row in PLAYER_SHORTCUTS" :key="row.label">
          <span class="text-muted-foreground">{{ row.label }}</span><span>{{ row.keys }}</span>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PLAYER_SHORTCUTS } from '@/composables/usePlayerHotkeys'

defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [value: boolean] }>()
</script>
