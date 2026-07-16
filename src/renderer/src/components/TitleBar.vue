<template>
  <div
    class="flex h-9 shrink-0 items-center justify-between bg-background border-b select-none"
    style="-webkit-app-region: drag"
  >
    <span class="pl-3 text-xs text-muted-foreground">Instalib{{ version ? ` v${version}` : '' }}</span>
    <div class="flex h-full" style="-webkit-app-region: no-drag">
      <button
        class="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
        @click="minimize"
      >
        <MinusIcon class="size-4" />
      </button>
      <button
        class="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
        @click="toggleMaximize"
      >
        <CopyIcon v-if="maximized" class="size-3.5 -scale-x-100" />
        <SquareIcon v-else class="size-3.5" />
      </button>
      <button
        class="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
        @click="close"
      >
        <XIcon class="size-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { CopyIcon, MinusIcon, SquareIcon, XIcon } from '@lucide/vue'

const version = ref('')
const maximized = ref(false)

let unsubscribe: (() => void) | undefined

onMounted(async () => {
  version.value = await window.api.getAppVersion()
  maximized.value = await window.api.windowIsMaximized()
  unsubscribe = window.api.onWindowMaximizedChanged((m) => (maximized.value = m))
})

onUnmounted(() => unsubscribe?.())

function minimize(): void {
  window.api.windowMinimize()
}

function toggleMaximize(): void {
  window.api.windowToggleMaximize()
}

function close(): void {
  window.api.windowClose()
}
</script>
