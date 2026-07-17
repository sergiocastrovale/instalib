import { describe, expect, it } from 'vitest'
import { formatDate, formatDuration } from '@/lib/format'

describe('formatDuration', () => {
  it('formats under an hour as m:ss', () => {
    expect(formatDuration(65)).toBe('1:05')
  })

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('pads seconds and minutes to 2 digits', () => {
    expect(formatDuration(3605)).toBe('1:00:05')
    expect(formatDuration(9)).toBe('0:09')
  })

  it('rounds fractional seconds', () => {
    expect(formatDuration(59.6)).toBe('1:00')
  })

  it('clamps negative durations to 0', () => {
    expect(formatDuration(-5)).toBe('0:00')
  })
})

describe('formatDate', () => {
  it('formats a timestamp as month/day/year', () => {
    const result = formatDate(new Date(Date.UTC(2024, 5, 15)).getTime())
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/Jun/)
  })
})
