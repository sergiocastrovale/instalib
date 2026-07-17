import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import QueueList from '@/components/QueueList.vue'
import QueueItem from '@/components/QueueItem.vue'
import type { VideoDto } from '@shared/types'

function makeVideo(overrides: Partial<VideoDto> = {}): VideoDto {
  return {
    id: 'v1',
    shortcode: 'ABC',
    permalink: 'https://www.instagram.com/p/ABC/',
    author: 'author',
    caption: null,
    savedAt: 0,
    durationSec: 30,
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

describe('QueueList', () => {
  it('renders one QueueItem per video, marking the active one', () => {
    const videos = [makeVideo({ id: 'a' }), makeVideo({ id: 'b' })]
    const wrapper = mount(QueueList, {
      props: { videos, activeId: 'b', autoplay: true, shuffleOn: false },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })
    const items = wrapper.findAllComponents(QueueItem)
    expect(items).toHaveLength(2)
    expect(items[0]!.props('active')).toBe(false)
    expect(items[1]!.props('active')).toBe(true)
  })

  it('emits update:autoplay when the Autoplay button is clicked', async () => {
    const wrapper = mount(QueueList, {
      props: { videos: [], autoplay: false, shuffleOn: false },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:autoplay')).toEqual([[true]])
  })

  it('emits shuffle when the shuffle button is clicked', async () => {
    const wrapper = mount(QueueList, {
      props: { videos: [], autoplay: false, shuffleOn: false },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })
    const buttons = wrapper.findAll('button')
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('shuffle')).toBeTruthy()
  })
})
