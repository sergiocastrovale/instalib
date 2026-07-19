<template>
  <button type="button" class="text-sm text-primary hover:underline" @click="open = true">
    How do I do this?
  </button>
  <ExportInstructionsDialog v-model:open="open" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ExportInstructionsDialog from '@/components/ExportInstructionsDialog.vue'

const open = ref(false)
</script>
