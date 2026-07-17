<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-6">
    <h1 class="text-2xl font-semibold">Settings</h1>

    <Tabs default-value="downloads">
      <TabsList>
        <TabsTrigger value="downloads">Downloads</TabsTrigger>
        <TabsTrigger value="setup">Setup</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="downloads" class="flex flex-col gap-6">
        <DownloadsSettings />
      </TabsContent>

      <TabsContent value="setup" class="flex flex-col gap-6">
        <SetupSettings />
      </TabsContent>

      <TabsContent value="data" class="flex flex-col gap-6">
        <DataSettings />
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DownloadsSettings from '@/components/settings/DownloadsSettings.vue'
import SetupSettings from '@/components/settings/SetupSettings.vue'
import DataSettings from '@/components/settings/DataSettings.vue'
</script>
