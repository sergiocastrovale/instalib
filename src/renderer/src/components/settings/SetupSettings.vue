<template>
  <Card>
    <CardHeader>
      <CardTitle>Instagram cookies</CardTitle>
      <CardDescription>
        Used by yt-dlp to resolve and download your saved videos. Pick the browser you're logged into Instagram with.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <Select :model-value="settings?.cookiesBrowser ?? undefined" @update:model-value="onBrowserChange">
        <SelectTrigger class="w-56"><SelectValue placeholder="Select a browser" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="b in browsers" :key="b.id" :value="b.id">{{ b.label }}</SelectItem>
        </SelectContent>
      </Select>
      <p v-if="selectedWarning" class="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <TriangleAlertIcon class="size-3.5 shrink-0 mt-0.5" /> {{ selectedWarning }}
      </p>
      <p v-if="!browsers.length" class="text-xs text-muted-foreground">No supported browsers detected on this machine.</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>yt-dlp</CardTitle>
      <CardDescription>Instagram changes often break video resolution — keep yt-dlp updated.</CardDescription>
    </CardHeader>
    <CardContent class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">
        Version: <span class="font-mono">{{ toolStatus?.ytDlpVersion ?? 'unknown' }}</span>
      </span>
      <Button variant="outline" :disabled="updating" @click="updateYtDlp">
        <Loader2Icon v-if="updating" class="size-4 animate-spin" />
        Update yt-dlp
      </Button>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Sync folder</CardTitle>
      <CardDescription>Where synced videos are saved. Defaults to your OS Videos folder.</CardDescription>
    </CardHeader>
    <CardContent class="flex items-center gap-2">
      <Input :model-value="settings?.syncFolder ?? ''" readonly class="flex-1 bg-secondary font-mono text-xs" />
      <Button variant="outline" @click="pickFolder">Change…</Button>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        Data location
        <span
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="dataLocation?.portable ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-primary/15 text-primary'"
        >
          {{ dataLocation?.portable ? 'Portable' : 'Installed' }}
        </span>
      </CardTitle>
      <CardDescription>
        {{
          dataLocation?.portable
            ? "Everything (database and downloaded tools) lives next to this executable — nothing was installed to your system."
            : 'Database and downloaded tools live in your OS profile folder.'
        }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <Input :model-value="dataLocation?.path ?? ''" readonly class="bg-secondary font-mono text-xs" />
      <div class="space-y-1.5 text-sm">
        <div class="flex items-center gap-2">
          <CheckIcon class="size-4 text-emerald-500" />
          <span>Database</span>
          <span v-if="dbInfo" class="font-mono text-xs text-muted-foreground">
            {{ dbInfo.engine }} · SQLite {{ dbInfo.sqliteVersion }} · schema v{{ dbInfo.schemaVersion }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <CheckIcon v-if="toolStatus?.ytDlp" class="size-4 text-emerald-500" />
          <XIcon v-else class="size-4 text-destructive" />
          <span>yt-dlp</span>
          <span v-if="toolStatus?.ytDlpVersion" class="font-mono text-xs text-muted-foreground">{{ toolStatus.ytDlpVersion }}</span>
        </div>
        <div class="flex items-center gap-2">
          <CheckIcon v-if="toolStatus?.ffmpeg" class="size-4 text-emerald-500" />
          <XIcon v-else class="size-4 text-destructive" />
          <span>ffmpeg</span>
          <span v-if="toolStatus?.ffmpegVersion" class="font-mono text-xs text-muted-foreground">{{ toolStatus.ffmpegVersion }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { CheckIcon, Loader2Icon, TriangleAlertIcon, XIcon } from '@lucide/vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsData } from '@/composables/useSettingsData'

const { settings, browsers, dataLocation, toolStatus, dbInfo, updating, selectedWarning, pickFolder, onBrowserChange, updateYtDlp } =
  useSettingsData()
</script>
