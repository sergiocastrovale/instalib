import { describe, expect, it } from 'vitest'
import { infoJsonPath, unlinkQuiet } from '../../../src/main/services/fs-utils'

describe('infoJsonPath', () => {
  it('swaps a known extension for .info.json', () => {
    expect(infoJsonPath('/videos/my-clip.mp4')).toBe('/videos/my-clip.info.json')
  })

  it('handles multi-dot basenames by only stripping the last extension', () => {
    expect(infoJsonPath('/videos/my.cool.clip.mp4')).toBe('/videos/my.cool.clip.info.json')
  })

  it('appends .info.json when there is no extension', () => {
    expect(infoJsonPath('/videos/my-clip')).toBe('/videos/my-clip.info.json')
  })
})

describe('unlinkQuiet', () => {
  it('resolves without throwing when the file does not exist', async () => {
    await expect(unlinkQuiet('/nonexistent/path/does-not-exist.tmp')).resolves.toBeUndefined()
  })
})
