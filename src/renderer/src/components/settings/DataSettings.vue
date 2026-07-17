<template>
  <Card>
    <CardHeader>
      <CardTitle>Import more</CardTitle>
      <CardDescription>Upload a fresh export .zip — already-saved videos are updated, not duplicated.</CardDescription>
    </CardHeader>
    <CardContent>
      <ImportDropzone @imported="lib.refresh" />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Covers</CardTitle>
      <CardDescription>Thumbnail images fetched in the background for saved videos.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-1">
      <p class="flex items-center gap-2 text-sm">
        <Loader2Icon v-if="coverStatus?.running" class="size-3.5 animate-spin text-muted-foreground" />
        {{ coverStatusText }}
      </p>
    </CardContent>
  </Card>

  <Card class="border-destructive/50">
    <CardHeader>
      <CardTitle class="text-destructive">Purge database</CardTitle>
      <CardDescription>
        Stops any download or cover fetch in progress and deletes everything from the database.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="destructive" @click="showPurgeConfirm = true">Purge database</Button>
    </CardContent>
  </Card>

  <ConfirmDialog
    v-model:open="showPurgeConfirm"
    title="Are you sure?"
    description="This stops any download or cover fetch in progress and permanently deletes all saved videos, collections, and notes from the database. This cannot be undone."
    confirm-label="Purge"
    :loading="purging"
    @confirm="confirmPurge"
  >
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <Label>Also remove all downloaded videos</Label>
        <Switch v-model="removeVideos" />
      </div>
      <div class="flex items-center justify-between gap-2">
        <Label>Also remove all downloaded video cover images</Label>
        <Switch v-model="removeCovers" />
      </div>
    </div>
  </ConfirmDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loader2Icon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import ImportDropzone from '@/components/ImportDropzone.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useCoverStatus } from '@/composables/useCoverStatus'
import { useLibraryStore } from '@/stores/library'

const lib = useLibraryStore()
const { coverStatus, coverStatusText, refresh: refreshCoverStatus } = useCoverStatus()

const showPurgeConfirm = ref(false)
const removeVideos = ref(true)
const removeCovers = ref(true)
const purging = ref(false)

async function confirmPurge(): Promise<void> {
  purging.value = true
  try {
    await window.api.dbPurge({ removeVideos: removeVideos.value, removeCovers: removeCovers.value })
    showPurgeConfirm.value = false
    toast.success('Database purged')
    await refreshCoverStatus()
  } catch {
    toast.error('Purge failed')
  } finally {
    purging.value = false
  }
}
</script>
