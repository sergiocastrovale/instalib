import { describe, expect, it } from 'vitest'
import { slug } from '../../../src/main/services/downloader'

describe('slug', () => {
  it('lowercases and dash-separates', () => {
    expect(slug('My Cool Video')).toBe('my-cool-video')
  })

  it('strips unicode into dashes', () => {
    expect(slug('Café Déjà Vu 🎬')).toBe('caf-d-j-vu')
  })

  it('truncates to 60 characters', () => {
    const long = 'a'.repeat(100)
    const result = slug(long)
    expect(result.length).toBe(60)
    expect(result).toBe('a'.repeat(60))
  })

  it('strips leading and trailing dashes', () => {
    expect(slug('--wow--')).toBe('wow')
    expect(slug('!!!weird!!!')).toBe('weird')
  })

  it('falls back to "unknown" for null/undefined/empty', () => {
    expect(slug(null)).toBe('unknown')
    expect(slug(undefined)).toBe('unknown')
    expect(slug('')).toBe('unknown')
  })

  it('falls back to "unknown" when everything strips away', () => {
    expect(slug('!!!')).toBe('unknown')
  })
})
