import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import VideoCard from '@/components/VideoCard.vue'
import type { VideoDto } from '@shared/types'

function makeVideo(overrides: Partial<VideoDto> = {}): VideoDto {
  return {
    id: 'v1',
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: 'author',
    caption: 'caption',
    savedAt: 0,
    durationSec: 90,
    filePath: null,
    thumbPath: null,
    status: 'downloaded',
    error: null,
    positionSec: 0,
    speed: 1,
    watched: false,
    favorite: false,
    notes: '',
    lastPlayedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

function mountCard(props: InstanceType<typeof VideoCard>['$props']) {
  return mount(VideoCard, { props, global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('VideoCard', () => {
  it('builds the watch href with list and from query params when given', () => {
    const wrapper = mountCard({ video: makeVideo({ id: 'v1' }), listId: 'favorites', from: 'library' })
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/watch/v1?list=favorites&from=library')
  })

  it('builds a bare watch href when no listId/from are given', () => {
    const wrapper = mountCard({ video: makeVideo({ id: 'v1' }) })
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/watch/v1')
  })

  it('shows the thumbnail image when thumbPath is set', () => {
    const wrapper = mountCard({ video: makeVideo({ id: 'v1', thumbPath: '/x.jpg' }) })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('app-media://thumb/v1')
  })

  it('falls back to a placeholder icon when there is no thumbnail', () => {
    const wrapper = mountCard({ video: makeVideo({ thumbPath: null }) })
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows formatted duration for the default variant', () => {
    const wrapper = mountCard({ video: makeVideo({ durationSec: 90 }) })
    expect(wrapper.text()).toContain('1:30')
  })

  it('shows position/duration for the resume variant', () => {
    const wrapper = mountCard({ video: makeVideo({ durationSec: 90, positionSec: 30 }), variant: 'resume' })
    expect(wrapper.text()).toContain('0:30 / 1:30')
  })

  it('renders the local/web source badge based on filePath', () => {
    const local = mountCard({ video: makeVideo({ filePath: '/x.mp4' }) })
    expect(local.text()).toContain('Downloaded')

    const web = mountCard({ video: makeVideo({ filePath: null }) })
    expect(web.text()).toContain('Web')
  })
})
