import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractShortcode, parseSavedCollections, parseSavedPosts } from '../../../src/main/services/instagram'

const fixturesDir = join(__dirname, '..', '..', 'fixtures')

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'))
}

describe('extractShortcode', () => {
  it('extracts from /p/ URLs', () => {
    expect(extractShortcode('https://www.instagram.com/p/ABC123/')).toBe('ABC123')
  })

  it('extracts from /reel/ URLs', () => {
    expect(extractShortcode('https://www.instagram.com/reel/XYZ789/')).toBe('XYZ789')
  })

  it('extracts from /tv/ URLs', () => {
    expect(extractShortcode('https://www.instagram.com/tv/NEW002/')).toBe('NEW002')
  })

  it('extracts with trailing query string', () => {
    expect(extractShortcode('https://www.instagram.com/tv/NEW002/?utm_source=ig')).toBe('NEW002')
  })

  it('returns null when no match', () => {
    expect(extractShortcode('https://www.instagram.com/stories/someone/')).toBeNull()
  })
})

describe('parseSavedPosts', () => {
  it('parses the old (string_map_data / string_list_data) export shape', () => {
    const items = parseSavedPosts(loadFixture('saved_posts.old.json'))
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ shortcode: 'ABC123', author: 'some_author' })
    expect(items[0]!.savedAt.getTime()).toBe(1700000000 * 1000)
    expect(items[1]).toMatchObject({ shortcode: 'XYZ789', author: 'list_author' })
  })

  it('skips entries with no href', () => {
    const items = parseSavedPosts(loadFixture('saved_posts.old.json'))
    expect(items.find((i) => i.author === 'no_href_author')).toBeUndefined()
  })

  it('parses the new (label_values + Owner dict) export shape, array root', () => {
    const items = parseSavedPosts(loadFixture('saved_posts.new.json'))
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ shortcode: 'NEW001', author: 'newauthor' })
    expect(items[0]!.savedAt.getTime()).toBe(1700000000 * 1000)
    expect(items[1]).toMatchObject({ shortcode: 'NEW002', author: undefined })
  })

  it('converts second-based timestamps, not millisecond-based', () => {
    const items = parseSavedPosts(loadFixture('saved_posts.old.json'))
    expect(items[0]!.savedAt.getFullYear()).toBe(2023)
  })

  it('returns [] for unrecognized shapes', () => {
    expect(parseSavedPosts(loadFixture('saved_posts.malformed.json'))).toEqual([])
  })

  it('returns [] for non-object input', () => {
    expect(parseSavedPosts(null)).toEqual([])
    expect(parseSavedPosts(42)).toEqual([])
  })
})

describe('parseSavedCollections', () => {
  it('parses the old export shape and skips unnamed collections', () => {
    const collections = parseSavedCollections(loadFixture('saved_collections.old.json'))
    expect(collections).toHaveLength(2)
    expect(collections[0]).toEqual({ name: 'My Collection', shortcodes: ['ABC123'] })
    expect(collections[1]).toEqual({ name: 'Legacy Named', shortcodes: ['XYZ789'] })
  })

  it('parses the new (label_values) export shape and skips unnamed collections', () => {
    const collections = parseSavedCollections(loadFixture('saved_collections.new.json'))
    expect(collections).toHaveLength(1)
    expect(collections[0]).toEqual({ name: 'New Collection', shortcodes: ['NEW001', 'NEW002'] })
  })

  it('returns [] for unrecognized/malformed shapes instead of throwing', () => {
    expect(parseSavedCollections(loadFixture('saved_collections.malformed.json'))).toEqual([])
    expect(parseSavedCollections(null)).toEqual([])
    expect(parseSavedCollections(undefined)).toEqual([])
  })
})
