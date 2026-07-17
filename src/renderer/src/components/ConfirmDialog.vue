<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>
      <slot />
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button variant="destructive" :disabled="loading" @click="$emit('confirm')">
          <Loader2Icon v-if="loading" class="size-4 animate-spin" />
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Loader2Icon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    loading?: boolean
  }>(),
  { confirmLabel: 'Confirm', loading: false }
)

defineEmits<{ 'update:open': [value: boolean]; confirm: [] }>()
</script>
