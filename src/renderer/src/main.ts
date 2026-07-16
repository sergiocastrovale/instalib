import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { applyTheme } from './lib/theme'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './assets/main.css'

window.api
  .settingsGet()
  .then((s) => applyTheme(s.theme))
  .catch(() => applyTheme('dark'))
  .finally(() => {
    createApp(App).use(createPinia()).use(router).mount('#app')
  })
