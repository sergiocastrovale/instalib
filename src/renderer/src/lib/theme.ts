import { ref } from 'vue'
import type { Theme } from '@shared/types'

export const currentTheme = ref<Theme>('dark')

export function applyTheme(theme: Theme): void {
  currentTheme.value = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export async function toggleTheme(): Promise<void> {
  const next: Theme = currentTheme.value === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  await window.api.settingsSet({ theme: next })
}
