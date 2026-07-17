import { describe, expect, it, vi } from 'vitest'
import { useCoverStatus } from '@/composables/useCoverStatus'

describe('useCoverStatus', () => {
  it('coverStatusText is empty before the first refresh', () => {
    const { coverStatusText } = useCoverStatus()
    expect(coverStatusText.value).toBe('')
  })

  it('shows a running message with the current label and progress', async () => {
    vi.mocked(window.api.coverFetchStatus).mockResolvedValue({
      running: true,
      currentVideoId: 'v1',
      currentLabel: 'some-author-ABC',
      covered: 3,
      total: 10
    })
    const { coverStatusText, refresh } = useCoverStatus()
    await refresh()
    expect(coverStatusText.value).toBe('Downloading some-author-ABC (3 of 10 covers downloaded)')
  })

  it('shows "no covers to fetch yet" when total is 0', async () => {
    vi.mocked(window.api.coverFetchStatus).mockResolvedValue({
      running: false,
      currentVideoId: null,
      currentLabel: null,
      covered: 0,
      total: 0
    })
    const { coverStatusText, refresh } = useCoverStatus()
    await refresh()
    expect(coverStatusText.value).toBe('No covers to fetch yet')
  })

  it('shows progress when idle and partially covered', async () => {
    vi.mocked(window.api.coverFetchStatus).mockResolvedValue({
      running: false,
      currentVideoId: null,
      currentLabel: null,
      covered: 4,
      total: 10
    })
    const { coverStatusText, refresh } = useCoverStatus()
    await refresh()
    expect(coverStatusText.value).toBe('4 of 10 covers downloaded')
  })

  it('shows "all covered" when idle and fully covered', async () => {
    vi.mocked(window.api.coverFetchStatus).mockResolvedValue({
      running: false,
      currentVideoId: null,
      currentLabel: null,
      covered: 10,
      total: 10
    })
    const { coverStatusText, refresh } = useCoverStatus()
    await refresh()
    expect(coverStatusText.value).toBe('All 10 covers downloaded')
  })
})
