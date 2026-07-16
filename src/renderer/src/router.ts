import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

export const navigating = ref(false)

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'library', component: () => import('./pages/LibraryPage.vue') },
    { path: '/collection/:id', name: 'collection', component: () => import('./pages/CollectionPage.vue') },
    { path: '/watch/:id', name: 'watch', component: () => import('./pages/WatchPage.vue') },
    { path: '/sync', redirect: '/settings' },
    { path: '/settings', name: 'settings', component: () => import('./pages/SettingsPage.vue') },
    { path: '/setup', name: 'setup', component: () => import('./pages/SetupPage.vue') }
  ]
})

router.beforeEach(async (to) => {
  navigating.value = true
  if (to.name === 'setup') return true
  const status = await window.api.setupStatus()
  if (!status.ytDlp || !status.ffmpeg) {
    return { name: 'setup' }
  }
  return true
})

router.afterEach(() => {
  navigating.value = false
})

router.onError(() => {
  navigating.value = false
})
