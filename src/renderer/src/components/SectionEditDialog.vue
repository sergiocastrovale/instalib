<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit section</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label for="section-name">Name</Label>
          <Input id="section-name" v-model="editName" class="bg-secondary" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="section-notes">Notes</Label>
          <textarea
            id="section-notes"
            v-model="editNotes"
            rows="4"
            placeholder="What to practice in this section…"
            class="w-full resize-y rounded-lg border bg-secondary p-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onCancel">Cancel</Button>
        <Button @click="onSave">Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { VideoSection } from '@shared/types'

const props = defineProps<{
  open: boolean
  section: VideoSection | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [payload: { name: string; notes: string }]
}>()

const editName = ref('')
const editNotes = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.section) {
      editName.value = props.section.name
      editNotes.value = props.section.notes
    }
  }
)

function onCancel(): void {
  emit('update:open', false)
}

function onSave(): void {
  emit('save', { name: editName.value.trim() || props.section?.name || '', notes: editNotes.value })
  emit('update:open', false)
}
</script>
