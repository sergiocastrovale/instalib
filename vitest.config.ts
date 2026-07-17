import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'src/renderer/src/components/ui/**',
        'src/preload/**',
        'src/main/index.ts',
        'src/main/window.ts',
        'out/**'
      ]
    },
    projects: [
      {
        test: {
          name: 'main',
          environment: 'node',
          include: ['tests/unit/main/**/*.test.ts', 'tests/unit/shared/**/*.test.ts']
        },
        resolve: {
          alias: {
            '@shared': resolve(__dirname, 'src/shared'),
            electron: resolve(__dirname, 'tests/mocks/electron.ts')
          }
        }
      },
      {
        test: {
          name: 'renderer',
          environment: 'happy-dom',
          include: ['tests/unit/renderer/**/*.test.ts'],
          setupFiles: ['tests/setup/renderer.setup.ts']
        },
        plugins: [vue()],
        resolve: {
          alias: {
            '@': resolve(__dirname, 'src/renderer/src'),
            '@shared': resolve(__dirname, 'src/shared')
          }
        }
      }
    ]
  }
})
