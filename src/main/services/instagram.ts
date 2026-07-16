export interface ParsedSavedItem {
  shortcode: string
  permalink: string
  author?: string
  savedAt: Date
}

export interface ParsedCollection {
  name: string
  shortcodes: string[]
}

const SHORTCODE_RE = /\/(?:p|reel|tv)\/([^/?#]+)/

export function extractShortcode(url: string): string | null {
  const match = url.match(SHORTCODE_RE)
  return match?.[1] ?? null
}

function toDate(timestamp: unknown): Date {
  if (typeof timestamp === 'number') {
    // Instagram exports use seconds, not ms
    return new Date(timestamp * 1000)
  }
  return new Date()
}

/**
 * Newer Instagram exports (2025+) nest everything under a "label_values" tree
 * instead of "string_map_data" — same data, different envelope. This walks a
 * label_values array to find the { label: "URL", href } entry.
 */
function findHrefInLabelValues(items: unknown): string | undefined {
  if (!Array.isArray(items)) return undefined
  for (const item of items as Record<string, unknown>[]) {
    if (item?.label === 'URL' && typeof item.href === 'string' && item.href) return item.href as string
  }
  return undefined
}

function findAuthorInLabelValues(items: unknown): string | undefined {
  if (!Array.isArray(items)) return undefined
  const ownerGroup = (items as Record<string, unknown>[]).find((i) => i?.title === 'Owner' && Array.isArray(i.dict))
  const ownerWrapper = (ownerGroup?.dict as Record<string, unknown>[] | undefined)?.[0]
  const ownerFields = ownerWrapper?.dict as Record<string, unknown>[] | undefined
  const username = ownerFields?.find((i) => i?.label === 'Username')?.value
  return typeof username === 'string' ? username : undefined
}

/**
 * Instagram's "saved_posts.json" export shape has changed over time:
 * - Older exports: { "saved_saved_media": [{ "title": "<author>", "string_map_data": { "Saved on": { "href", "timestamp" } } }] }
 * - Newer exports: top-level array of { "timestamp", "label_values": [{ "label": "URL", "href" }, { "title": "Owner", "dict": [...] }, ...] }
 * Parsed defensively to survive further format drift.
 */
export function parseSavedPosts(json: unknown): ParsedSavedItem[] {
  const root = json as Record<string, unknown>
  const list = (root?.saved_saved_media ?? root?.saved_media ?? (Array.isArray(json) ? json : null)) as unknown[] | null
  if (!Array.isArray(list)) return []

  const items: ParsedSavedItem[] = []
  for (const entry of list) {
    const e = entry as Record<string, unknown>

    let href: string | undefined
    let author: string | undefined
    let timestamp: unknown

    if (Array.isArray(e.label_values)) {
      href = findHrefInLabelValues(e.label_values)
      author = findAuthorInLabelValues(e.label_values)
      timestamp = e.timestamp
    } else {
      const stringMap = (e.string_map_data ?? {}) as Record<string, { href?: string; timestamp?: number }>
      const stringList = (e.string_list_data ?? []) as { href?: string; timestamp?: number }[]
      const entryFromMap = stringMap['Saved on'] ?? Object.values(stringMap)[0]
      const entryFromList = stringList[0]
      href = entryFromMap?.href ?? entryFromList?.href
      timestamp = entryFromMap?.timestamp ?? entryFromList?.timestamp
      author = typeof e.title === 'string' ? e.title : undefined
    }

    if (!href) continue
    const shortcode = extractShortcode(href)
    if (!shortcode) continue

    items.push({ shortcode, permalink: href, author, savedAt: toDate(timestamp) })
  }
  return items
}

/**
 * "saved_collections.json" shape mirrors the same old/new split as saved_posts.json.
 * Newer exports nest each collection's posts as label_values entries whose "dict"
 * is itself a label_values-shaped array (same shape as a saved_posts.json entry).
 * Returns [] (degrade to "All saved" only) if unrecognized.
 */
export function parseSavedCollections(json: unknown): ParsedCollection[] {
  try {
    const root = json as Record<string, unknown>
    const collectionsList = (root?.saved_collections_v2 ?? root?.saved_collections ?? (Array.isArray(json) ? json : null)) as unknown[] | null
    if (!Array.isArray(collectionsList)) return []

    const collections: ParsedCollection[] = []
    for (const entry of collectionsList) {
      const e = entry as Record<string, unknown>

      let collectionName: string | undefined
      const shortcodes: string[] = []

      if (Array.isArray(e.label_values)) {
        const labelValues = e.label_values as Record<string, unknown>[]
        collectionName = labelValues.find((i) => i.label === 'Name' && typeof i.value === 'string')?.value as string | undefined
        for (const item of labelValues) {
          if (!Array.isArray(item.dict)) continue
          // A collection's posts all live in one label_values item whose "dict" is
          // an array of post wrappers; each wrapper's own "dict" is that post's
          // label_values array (same wrapping pattern as the Owner field).
          for (const wrapper of item.dict as Record<string, unknown>[]) {
            const href = findHrefInLabelValues(wrapper?.dict)
            if (!href) continue
            const sc = extractShortcode(href)
            if (sc) shortcodes.push(sc)
          }
        }
      } else {
        const stringMap = e.string_map_data as Record<string, { value?: string }> | undefined
        collectionName = typeof e.name === 'string' ? e.name : stringMap?.Name?.value

        const media = (e.saved_media ?? e.media ?? []) as Record<string, unknown>[]
        for (const m of media) {
          const href = (m.href ?? (m.string_map_data as Record<string, { href?: string }> | undefined)?.['Saved on']?.href) as string | undefined
          if (typeof href === 'string') {
            const sc = extractShortcode(href)
            if (sc) shortcodes.push(sc)
          }
        }
      }

      if (!collectionName) continue
      collections.push({ name: collectionName, shortcodes })
    }
    return collections
  } catch {
    return []
  }
}
