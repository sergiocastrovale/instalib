import { computed, type Ref } from 'vue'
import type { BreadcrumbItem } from '@/components/Breadcrumbs.vue'

export function useBreadcrumbs(from: Ref<string | undefined>) {
  const root = computed<BreadcrumbItem>(() => ({
    label: from.value === 'search' ? 'Search' : 'Home',
    to: '/'
  }))

  return { root }
}
