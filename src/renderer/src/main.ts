import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { applyTheme } from './lib/theme'
import './assets/main.css'

window.api
  .settingsGet()
  .then((s) => applyTheme(s.theme))
  .catch(() => applyTheme('dark'))
  .finally(() => {
    createApp(App).use(createPinia()).use(router).mount('#app')
  })
