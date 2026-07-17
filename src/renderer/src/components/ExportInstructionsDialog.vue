<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent>
      <DialogHeader><DialogTitle>Exporting your saved collections</DialogTitle></DialogHeader>
      <ol class="list-decimal space-y-2 pl-5 text-sm text-muted-foreground marker:text-foreground">
        <li>Open Instagram (app or website) → go to your profile.</li>
        <li><strong class="text-foreground">Accounts Center</strong> → <strong class="text-foreground">Your information and permissions</strong> → <strong class="text-foreground">Export your information</strong>.</li>
        <li>Choose <strong class="text-foreground">Export to device</strong>.</li>
        <li>Select <strong class="text-foreground">Some of your information</strong>, then pick only <strong class="text-foreground">Saved</strong>.</li>
        <li>Set the format to <strong class="text-foreground">JSON</strong> (not HTML).</li>
        <li>Submit. Instagram emails you a download link, usually within an hour.</li>
        <li>Download the <code class="text-foreground">.zip</code> file it gives you. Don't unzip it - Instalib reads it directly.</li>
        <li>Drag it to the importing panel and wait for the setup to finish.</li>
      </ol>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [value: boolean] }>()
</script>
