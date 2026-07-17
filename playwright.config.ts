import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 30000,
  trace: 'on-first-retry',
  reporter: 'list'
})
