import { describe, expect, it } from 'vitest'
import { parseExpiryFromUrl } from '../../../src/main/services/resolver'

const FALLBACK_TTL_MS = 2 * 60 * 60 * 1000

describe('parseExpiryFromUrl', () => {
  it('parses a valid hex oe= param as a unix-seconds expiry', () => {
    // 0x68123456 seconds since epoch
    const hex = '68123456'
    const expected = parseInt(hex, 16) * 1000
    const url = `https://scontent.cdninstagram.com/video.mp4?oe=${hex}&ot=abc`
    expect(parseExpiryFromUrl(url)).toBe(expected)
  })

  it('falls back to TTL when oe= param is missing', () => {
    const before = Date.now()
    const result = parseExpiryFromUrl('https://scontent.cdninstagram.com/video.mp4?ot=abc')
    expect(result).toBeGreaterThanOrEqual(before + FALLBACK_TTL_MS)
    expect(result).toBeLessThanOrEqual(Date.now() + FALLBACK_TTL_MS)
  })

  it('falls back to TTL for invalid (non-hex) oe= value', () => {
    const before = Date.now()
    const result = parseExpiryFromUrl('https://scontent.cdninstagram.com/video.mp4?oe=zzzz')
    expect(result).toBeGreaterThanOrEqual(before + FALLBACK_TTL_MS)
  })

  it('falls back to TTL for a zero/negative oe= value', () => {
    const before = Date.now()
    const result = parseExpiryFromUrl('https://scontent.cdninstagram.com/video.mp4?oe=0')
    expect(result).toBeGreaterThanOrEqual(before + FALLBACK_TTL_MS)
  })
})
