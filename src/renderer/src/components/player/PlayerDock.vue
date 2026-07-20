<template>
  <Teleport :to="teleportTarget">
    <div v-if="state.video" :class="mini ? 'fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-lg border bg-card shadow-2xl' : 'w-full'">
      <div v-if="state.source === 'embed'" :class="mini ? 'pointer-events-none' : ''">
        <EmbedFallback :url="embedUrl" @retry="retryResolve" />
      </div>
      <template v-else>
        <div
          class="relative bg-black"
          :class="[
            state.focusMode && !mini ? 'mx-auto aspect-[9/16] max-h-[80vh] w-auto' : 'aspect-video',
            { hidden: state.audioOnly && !mini }
          ]"
        >
          <video
            :ref="(el) => bindVideoEl(el as HTMLVideoElement | null)"
            class="h-full w-full"
            :class="mini ? 'cursor-pointer' : ''"
            playsinline
            @click="mini ? goToWatch() : toggle()"
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onLoadedMetadata"
            @ended="onEnded"
            @play="onPlay"
            @pause="onPause"
            @error="onVideoError"
          />
          <div class="absolute left-2 top-2">
            <SourceBadge :source="state.source" />
          </div>
          <div v-if="state.resolving" class="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2Icon class="size-10 animate-spin text-white" />
          </div>
          <button
            v-else-if="!state.playing && !mini"
            class="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
            @click="toggle"
          >
            <PlayIcon class="size-16 text-white drop-shadow" />
          </button>
        </div>

        <div v-if="state.audioOnly && !mini" class="flex aspect-video flex-col items-center justify-center gap-2 bg-muted">
          <HeadphonesIcon class="size-12 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Audio-only mode</p>
        </div>
      </template>

      <!-- Mini controls -->
      <div v-if="mini" class="flex items-center gap-2 p-2">
        <button class="min-w-0 flex-1 cursor-pointer truncate text-left text-xs font-medium" @click="goToWatch">
          {{ state.video.author ?? state.video.shortcode }}
        </button>
        <Button size="icon" variant="ghost" class="size-7" @click="toggle" :disabled="state.source === 'embed'">
          <PauseIcon v-if="state.playing" class="size-4" />
          <PlayIcon v-else class="size-4" />
        </Button>
        <Button size="icon" variant="ghost" class="size-7" @click="closeMini">
          <XIcon class="size-4" />
        </Button>
        <div class="absolute inset-x-0 bottom-0 h-0.5 bg-white/20">
          <div class="h-full bg-primary" :style="{ width: playedPct + '%' }" />
        </div>
      </div>

      <!-- Full controls -->
      <div v-else class="flex flex-col gap-2 border-t bg-card p-3">
        <div class="group relative h-3 cursor-pointer" @click="onTrackClick">
          <div class="absolute inset-y-1 w-full rounded-full bg-secondary" />
          <div class="pointer-events-none absolute inset-y-1 left-0 rounded-full bg-muted-foreground/40" :style="{ width: bufferedPct + '%' }" />
          <div class="pointer-events-none absolute inset-y-1 left-0 rounded-full bg-primary" :style="{ width: playedPct + '%' }" />

          <div
            v-for="(sec, i) in sections"
            :key="sec.id"
            class="absolute inset-y-0 z-10 cursor-pointer rounded-[2px]"
            :style="{
              left: pctOf(sec.start) + '%',
              width: pctOf(sec.end) - pctOf(sec.start) + '%',
              background: sectionColor(i) + '4d'
            }"
            @click.stop="onBandClick(sec)"
            @mouseenter="hoveredId = sec.id"
            @mouseleave="hoveredId = null"
          >
            <div class="absolute inset-y-0 left-0 w-0.5" :style="{ background: sectionColor(i) }" />
            <div class="absolute inset-y-0 right-0 w-0.5" :style="{ background: sectionColor(i) }" />
          </div>

          <div
            v-if="state.pendingStart !== null"
            class="pointer-events-none absolute -top-0.5 z-20 h-4 w-0.5 bg-primary"
            :style="{ left: pctOf(state.pendingStart) + '%' }"
          />

          <div
            v-if="hoveredSection"
            class="pointer-events-none absolute bottom-full z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2.5 py-1 text-sm font-medium text-white"
            :style="{ left: pctOf(hoveredSection.start + (hoveredSection.end - hoveredSection.start) / 2) + '%' }"
          >
            {{ hoveredSection.name }}
          </div>

          <div
            class="pointer-events-none absolute top-1/2 z-30 size-3 -translate-y-1/2 rounded-full bg-primary opacity-0 transition group-hover:opacity-100"
            :style="{ left: `calc(${playedPct}% - 6px)` }"
          />
        </div>

        <div class="flex flex-wrap items-center gap-1">
          <Button size="icon" variant="ghost" :disabled="!queue.hasPrev()" @click="playPrevInQueue">
            <SkipBackIcon class="size-4" />
          </Button>
          <Button size="icon" variant="ghost" :disabled="state.source === 'embed'" @click="toggle">
            <PauseIcon v-if="state.playing" class="size-4" />
            <PlayIcon v-else class="size-4" />
          </Button>
          <Button size="icon" variant="ghost" :disabled="!queue.hasNext()" @click="playNextInQueue">
            <SkipForwardIcon class="size-4" />
          </Button>

          <span class="mx-1 whitespace-nowrap font-mono text-xs text-muted-foreground">
            {{ formatDuration(state.currentTime) }} / {{ formatDuration(state.duration) }}
          </span>

          <div class="flex items-center gap-1">
            <Button size="icon" variant="ghost" @click="toggleMuted">
              <VolumeXIcon v-if="state.muted || state.volume === 0" class="size-4" />
              <Volume2Icon v-else class="size-4" />
            </Button>
            <Slider
              class="w-20"
              :model-value="[state.muted ? 0 : state.volume * 100]"
              :max="100"
              :step="1"
              @update:model-value="(v) => v && setVolume(v[0]! / 100)"
            />
          </div>

          <div class="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button size="sm" variant="outline" class="min-w-[52px] bg-secondary font-mono font-semibold">{{ state.speed }}x</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem v-for="s in speedOptions" :key="s" @click="setSpeed(s)">{{ s }}x</DropdownMenuItem>
              <DropdownMenuSeparator />
              <div class="flex items-center justify-between gap-2 px-2 py-1">
                <Button size="icon" variant="outline" class="size-6" @click.stop="setSpeed(state.speed - 0.05)"><MinusIcon class="size-3" /></Button>
                <span class="font-mono text-xs">{{ state.speed.toFixed(2) }}x</span>
                <Button size="icon" variant="outline" class="size-6" @click.stop="setSpeed(state.speed + 0.05)"><PlusIcon class="size-3" /></Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            class="font-mono font-semibold"
            :class="{ 'border-primary bg-primary/15 text-primary': state.pendingStart !== null }"
            @click="startSection"
            title="Mark section start (A)"
          >
            [ Start
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="font-mono font-semibold disabled:cursor-default disabled:opacity-55"
            :disabled="!canEnd"
            @click="addSection"
            title="Mark section end (B)"
          >
            End ]
          </Button>

          <Button size="icon" variant="ghost" :class="{ 'text-primary': state.video?.favorite }" @click="toggleFavorite" title="Add to favorites">
            <HeartIcon class="size-4" :fill="state.video?.favorite ? 'currentColor' : 'none'" />
          </Button>
          <Button size="icon" variant="ghost" :class="{ 'text-primary': state.audioOnly }" @click="toggleAudioOnly" title="Audio only">
            <HeadphonesIcon class="size-4" />
          </Button>
          <Button size="icon" variant="ghost" @click="togglePip" title="Picture in picture">
            <PictureInPicture2Icon class="size-4" />
          </Button>
          <Button size="icon" variant="ghost" @click="toggleFullscreen" title="Fullscreen">
            <MaximizeIcon class="size-4" />
          </Button>
          <Button size="icon" variant="ghost" :class="{ 'text-primary': state.focusMode }" @click="toggleFocusMode" title="Focus mode">
            <SmartphoneIcon class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  HeadphonesIcon,
  HeartIcon,
  Loader2Icon,
  MaximizeIcon,
  MinusIcon,
  PauseIcon,
  PictureInPicture2Icon,
  PlayIcon,
  PlusIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SmartphoneIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatDuration } from '@/lib/format'
import { sectionColor } from '@/lib/sections'
import { usePlayer } from '@/composables/usePlayer'
import { useQueue } from '@/composables/useQueue'
import { router } from '@/router'
import SourceBadge from '@/components/SourceBadge.vue'
import EmbedFallback from './EmbedFallback.vue'
import type { VideoSection } from '@shared/types'

const {
  state,
  bindVideoEl,
  toggle,
  seek,
  setVolume,
  toggleMuted,
  setSpeed,
  sections,
  startSection,
  addSection,
  playSection,
  toggleAudioOnly,
  toggleFocusMode,
  toggleFavorite,
  playNextInQueue,
  playPrevInQueue,
  onTimeUpdate,
  onLoadedMetadata,
  onVideoError,
  onEnded,
  onPlay,
  onPause,
  retryResolve,
  videoEl
} = usePlayer()
const queue = useQueue()

const hoveredId = ref<string | null>(null)
const hoveredSection = computed(() => sections.value.find((s) => s.id === hoveredId.value) ?? null)
const canEnd = computed(
  () => state.pendingStart !== null && state.currentTime > state.pendingStart && sections.value.length < 8
)

function onBandClick(sec: VideoSection): void {
  playSection(sec)
}

const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

const mini = computed(() => !state.dockEl)
const teleportTarget = computed(() => state.dockEl ?? 'body')
const embedUrl = computed(() => (state.video ? `https://www.instagram.com/p/${state.video.shortcode}/embed/` : ''))

const playedPct = computed(() => pctOf(state.currentTime))
const bufferedPct = computed(() => pctOf(state.buffered))

function pctOf(sec: number): number {
  return state.duration > 0 ? Math.min(100, (sec / state.duration) * 100) : 0
}

function onTrackClick(e: MouseEvent): void {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  seek(ratio * state.duration)
}

function goToWatch(): void {
  if (state.video) router.push(`/watch/${state.video.id}${queue.listId.value ? `?list=${queue.listId.value}` : ''}`)
}

function closeMini(): void {
  videoEl.value?.pause()
  state.video = null
}

function togglePip(): void {
  if (!videoEl.value) return
  if (document.pictureInPictureElement) document.exitPictureInPicture()
  else videoEl.value.requestPictureInPicture?.().catch(() => {})
}

function toggleFullscreen(): void {
  if (!videoEl.value) return
  if (document.fullscreenElement) document.exitFullscreen()
  else videoEl.value.requestFullscreen?.().catch(() => {})
}
</script>
