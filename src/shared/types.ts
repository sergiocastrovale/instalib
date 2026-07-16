export type VideoStatus = 'pending' | 'downloading' | 'downloaded' | 'failed' | 'skipped'
export type PlaybackSourceKind = 'local' | 'web' | 'embed'
export type CollectionKind = 'imported' | 'user'

export interface VideoDto {
  id: string
  shortcode: string
  permalink: string
  author: string | null
  caption: string | null
  savedAt: number
  durationSec: number | null
  filePath: string | null
  thumbPath: string | null
  status: VideoStatus
  error: string | null
  positionSec: number
  speed: number
  watched: boolean
  favorite: boolean
  notes: string
  lastPlayedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CollectionDto {
  id: string
  name: string
  kind: CollectionKind
  syncEnabled: boolean
  videoCount: number
  coverVideoId: string | null
  createdAt: number
}

export interface PlaybackSource {
  source: PlaybackSourceKind
  url: string
  expiresAt?: number
  error?: string
}

export interface ImportResult {
  imported: number
  updated: number
  total: number
  collections: number
}

export type Theme = 'light' | 'dark'

export interface Settings {
  syncFolder: string
  cookiesBrowser: string | null
  syncUncategorized: boolean
  ytDlpVersion: string | null
  setupComplete: boolean
  theme: Theme
}

export type SyncEventType = 'progress' | 'queue' | 'log' | 'idle'

export interface SyncEvent {
  type: SyncEventType
  videoId?: string
  message?: string
  completed?: number
  total?: number
}

export interface SetupProgressEvent {
  binary: 'yt-dlp' | 'ffmpeg'
  pct: number
  phase: 'downloading' | 'extracting' | 'done' | 'error'
  error?: string
}

export interface SetupStatus {
  ytDlp: boolean
  ffmpeg: boolean
  ytDlpVersion: string | null
}

export interface SyncStatus {
  running: boolean
  currentVideoId: string | null
  completed: number
  total: number
}

export interface CoverFetchStatus {
  running: boolean
  currentVideoId: string | null
  currentLabel: string | null
  covered: number
  total: number
}

export interface VideoListQuery {
  collectionId?: string
  favorites?: boolean
  search?: string
  status?: VideoStatus
  sort?: 'savedAt' | 'author' | 'lastPlayedAt'
}

export interface DataLocation {
  path: string
  portable: boolean
}

export interface PurgeOptions {
  removeVideos: boolean
  removeCovers: boolean
}

export interface BrowserOption {
  id: string
  label: string
  warning?: string
}

export type VideoPatch = Partial<
  Pick<
    VideoDto,
    'positionSec' | 'speed' | 'watched' | 'favorite' | 'notes'
  >
>
