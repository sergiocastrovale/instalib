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

        <Separator />

        <div class="flex flex-col gap-1.5">
          <Label for="section-countin">Count-in</Label>
          <div class="flex items-center gap-2">
            <Input
              id="section-countin"
              v-model="editCountIn"
              type="number"
              min="0"
              :max="MAX_COUNT_IN_SEC"
              step="1"
              class="w-24 bg-secondary"
            />
            <span class="text-sm text-muted-foreground">seconds paused between repetitions (0 = off)</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Label for="section-ramp">Speed ramp</Label>
            <Switch id="section-ramp" :model-value="rampOn" @update:model-value="rampOn = $event" />
          </div>
          <div v-if="rampOn" class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <Label for="ramp-start" class="text-xs text-muted-foreground">Start</Label>
              <Input id="ramp-start" v-model="editRamp.startAt" type="number" min="0.25" max="2" step="0.05" class="bg-secondary" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="ramp-target" class="text-xs text-muted-foreground">Target</Label>
              <Input id="ramp-target" v-model="editRamp.endAt" type="number" min="0.25" max="2" step="0.05" class="bg-secondary" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="ramp-step" class="text-xs text-muted-foreground">Step</Label>
              <Input id="ramp-step" v-model="editRamp.step" type="number" min="0.05" max="0.5" step="0.05" class="bg-secondary" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="ramp-reps" class="text-xs text-muted-foreground">Reps per step</Label>
              <Input id="ramp-reps" v-model="editRamp.repsPerStep" type="number" min="1" max="20" step="1" class="bg-secondary" />
            </div>
          </div>
          <p v-if="rampOn" class="font-mono text-xs text-muted-foreground">{{ rampSummary }}</p>
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
import { computed, reactive, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DEFAULT_RAMP, MAX_COUNT_IN_SEC, clampCountIn, clampRamp } from '@/lib/sections'
import type { SectionRamp, VideoSection } from '@shared/types'

const props = defineProps<{
  open: boolean
  section: VideoSection | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [payload: { name: string; notes: string; countInSec?: number; ramp?: SectionRamp }]
}>()

const editName = ref('')
const editNotes = ref('')
const editCountIn = ref<number | string>(0)
const rampOn = ref(false)
const editRamp = reactive<Record<keyof SectionRamp, number | string>>({ ...DEFAULT_RAMP })

// inputs are strings while typing - clamp through the shared helpers on save
function currentRamp(): SectionRamp {
  return clampRamp({
    startAt: Number(editRamp.startAt),
    step: Number(editRamp.step),
    endAt: Number(editRamp.endAt),
    repsPerStep: Number(editRamp.repsPerStep)
  })
}

const rampSummary = computed(() => {
  const r = currentRamp()
  const steps = Math.ceil((r.endAt - r.startAt) / r.step)
  const every = r.repsPerStep === 1 ? 'every rep' : `every ${r.repsPerStep} reps`
  return `${r.startAt.toFixed(2)}x → ${r.endAt.toFixed(2)}x, +${r.step.toFixed(2)} ${every} (${steps} steps)`
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen || !props.section) return
    editName.value = props.section.name
    editNotes.value = props.section.notes
    editCountIn.value = props.section.countInSec ?? 0
    rampOn.value = !!props.section.ramp
    Object.assign(editRamp, props.section.ramp ?? DEFAULT_RAMP)
  }
)

function onCancel(): void {
  emit('update:open', false)
}

function onSave(): void {
  emit('save', {
    name: editName.value.trim() || props.section?.name || '',
    notes: editNotes.value,
    countInSec: clampCountIn(Number(editCountIn.value)),
    ramp: rampOn.value ? currentRamp() : undefined
  })
  emit('update:open', false)
}
</script>
