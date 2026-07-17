# Codebase Audit

Stack: Electron + Vue 3 (Composition API, `<script setup>`) + Pinia + vue-router, electron-vite. Renderer: `src/renderer/src`. Main process: `src/main` (better-sqlite3 DB, yt-dlp/ffmpeg downloader, `app-media://` protocol). Not Nuxt.

Checked and confirmed OK (do not re-audit): `savedAt` ms handling in formatDate, `durationSec` null-guards, SQL parameterization (no injection), media protocol path traversal (paths keyed by opaque id).

Fix items in order below. Each is self-contained: location, problem, fix direction.

## P0 — High severity bugs

- [x] `src/main/services/binaries.ts:111-118` — Interrupted yt-dlp download leaves truncated binary at final `ytDlpPath()` (no temp+rename). Next run's `existsSync` check treats it as installed forever; `binariesReady()` reports true on a broken binary. Same overwrite-only pattern for ffmpeg archive (:120-129). Fix: download to temp file, rename atomically on success only. (ffmpeg already used temp archive + atomic rename, left untouched.)
- [x] `src/renderer/src/composables/usePlayer.ts:70-88` (`applySource`) — No guard that `state.video` is still current after `await window.api.playerResolve(...)`. Rapid next/prev can let an earlier resolve finish last and set `el.src` to stale video's URL. Fix: capture video id before await, bail if `state.video?.id` changed by the time result returns.
- [x] `src/renderer/src/stores/library.ts:19-33` (`refresh`) — No `.catch` on the `Promise.all`. Rejection leaves `loading=true` forever (permanent skeletons), unhandled promise rejection, and `loaded=false` causes every page's mount check to retry endlessly. Fix: add `.catch` that resets `loading` and surfaces error.

## P1 — Medium severity bugs

- [x] `src/main/db/videos.ts:117-124` (`patchVideo`) — Any patch (favorite toggle, notes edit) unconditionally bumps `last_played_at = now`, corrupting "recently played" ordering. Fix: only bump `last_played_at` for actual playback-position patches, not favorite/notes/watched.
- [ ] `src/main/services/downloader.ts:146-157` + `src/main/index.ts:29-37` — Rows stuck in `status='downloading'` after a crash/force-quit are never recovered; `findNextPending` only selects `pending`. Fix: on app startup, reset stale `downloading` rows back to `pending`.
- [ ] `src/main/services/downloader.ts:38-40,65-90,192-198` — `requestStop()` only checked between videos/attempts; a running yt-dlp child is never killed, orphaning processes on app quit. `purgeDatabase` calls `requestStop()` then deletes files immediately while a download may still be writing. Fix: keep handle to spawned `proc`, call `proc.kill()` on stop/quit; await confirmed stop before purge deletes files.
- [ ] `src/main/ipc/index.ts:53-55` (+ `src/preload/index.ts:43`, `src/renderer/src/composables/useSyncProgress.ts:57`) — `syncStart({ collectionId })` sent by renderer but main handler takes no args and always syncs global scope (rename/refactor leftover). Collection-scoped sync silently syncs whole library instead. Fix: thread `collectionId` through the handler or remove the dead param from all three layers.
- [ ] `src/renderer/src/components/NotesPanel.vue:26-44` — Debounce timer not cleared on unmount; `modelValue` watcher overwrites unsaved local edits when navigating to a new video mid-debounce, then the stale timer fires `emit('save', ...)` with wrong/lost text. Data-loss risk. Fix: flush-or-cancel pending save on unmount and whenever `modelValue` changes.
- [ ] `src/renderer/src/pages/WatchPage.vue:135-137,212` (`loadVideoData` + `watch(videoId)`) — Unguarded concurrent fetches: fast navigation between videos can resolve out of order, leaving `video.value` set to a stale video. Also `videosGet` returning null (deleted video) shows the loading skeleton forever with no error state. Fix: add ordering guard (id check after await) + not-found UI state.
- [ ] `src/main/services/importer.ts:16-36` — Synchronous `readFileSync`/`AdmZip` on main thread freezes IPC/UI during large import; malformed JSON inside a ZIP throws raw uncaught `SyntaxError` (try/catch only covers the non-ZIP branch). Fix: move parse off main thread or chunk it; wrap ZIP branch in try/catch with a user-facing error.
- [ ] `src/renderer/src/router.ts:18-26` (`beforeEach`) — `await window.api.setupStatus()` has no try/catch; rejection aborts navigation and strands the user. Fix: wrap in try/catch with fallback route/state.
- [ ] `src/renderer/src/pages/SettingsPage.vue:211-224,239-243` — `load()`/`refreshCoverStatus()` called unawaited in `onMounted`, no error handling → unhandled rejections, null state, no user feedback. Fix: wrap in try/catch with error state (do alongside P2 settings composable extraction below).

## P2 — Slimness: pages → components/composables

- [ ] `WatchPage.vue:189-205` — Delete duplicated `toggleWatched`/`toggleFavorite`/`onSaveNotes`; delegate to existing `usePlayer.markWatched/toggleFavorite/saveNotes` (`usePlayer.ts:187-204`) instead of page holding its own `video` ref.
- [ ] `WatchPage.vue:237-298` — Extract ~60-line keyboard handler (`onKeydown` + listener wiring at :227-235) into a `usePlayerHotkeys(player)` composable; all branches already delegate to `player.*`. Also fix while here: ArrowLeft/Right and J/L seek shortcuts missing `e.preventDefault()` (:247-258), letting them scroll the page.
- [ ] `WatchPage.vue:159-187` — Move `ensureQueue`/`loadQueueVideos`/`shuffleQueue` and queue video objects into `useQueue` (page currently keeps a manually-synced local `queueVideos` ref — should live in the composable).
- [ ] `WatchPage.vue:43-80` — Extract "Up next" sidebar list into `QueueList`/`QueueItem` components (overlaps existing `VideoRow`/`VideoCard`, should reuse their look).
- [ ] `WatchPage.vue:82-99` — Extract static keyboard-shortcuts help table into a `ShortcutsDialog` component; source its rows from the same shortcut data used by `usePlayerHotkeys` so they can't drift apart.
- [ ] Shared `listQuery(listId)` helper — `id==='all'?{}:id==='favorites'?{favorites:true}:{collectionId:id}` triplicated at `CollectionPage.vue:117`, `WatchPage.vue:161`, `WatchPage.vue:170`. Extract once, reuse.
- [ ] Shared `useVideoFilters` composable — text/author filter + sort duplicated between `LibraryPage.vue:110-116` and `CollectionPage.vue:157-174`.
- [ ] Shared `ConfirmDialog` component — near-identical destructive-confirm dialogs at `CollectionPage.vue:59-76` and `SettingsPage.vue:149-176`.
- [ ] `SettingsPage.vue:16-109` and `:111-146` — Extract `SetupSettings.vue` and `DataSettings.vue` tabs (model: existing `components/settings/DownloadsSettings.vue`); move `load()`/polling/business logic (:211-277) into a `useSettingsData`/`useCoverStatus` composable (pattern already established in `useSyncProgress.ts`).
- [ ] `CollectionPage.vue:141-155,177-185` — Move delete-collection call and `playAll` (queue build + navigate) into composables (`playAll` belongs in `useQueue`); extract filter toolbar (:30-49) into `CollectionFilterBar` component.
- [ ] Breadcrumb assembly duplicated at `WatchPage.vue:139-150` and `CollectionPage.vue:105-108` — extract `useBreadcrumbs(listId, from)` helper.
- [ ] `LibraryPage.vue:92-108` — Move `continueWatching` selection and `mostRecentCoverId` cover-picking logic into library store/composable; extract search-results markup (:8-30) into a `SearchResults` component.
- [ ] `App.vue:12-50` — Extract header (search input, theme toggle, settings link, GitHub button) into a `TopBar` component.
- [ ] `SetupPage.vue:45-68` — (low priority) extract install orchestration + IPC progress subscription into `useSetupInstall()`, mirroring `useSyncProgress`.

## P3 — Low severity bugs / edge cases

- [ ] `src/main/protocol.ts:54-59` — Range header `start`/`end` not clamped/validated; `start>end` possible from a bad `Range` header, and `kind = url.hostname` is unchecked (non-`thumb` host falls through). Fix: clamp to `[0,size-1]`, return 416 on invalid range, validate `kind`.
- [ ] `src/main/ipc/index.ts:100` — `shell.openExternal` called on unvalidated renderer-supplied URL, no scheme allowlist. Fix: restrict to `http:`/`https:`.
- [ ] `src/renderer/src/composables/usePlayer.ts:45-56,266-281` — Progress timer isn't stopped on `ended` (only on `pause`, which the spec doesn't fire at end-of-media); keeps persisting every 5s indefinitely when autoplay is off / queue exhausted. Fix: stop timer on `ended` too.
- [ ] `usePlayer.ts:206-214` + `src/renderer/src/composables/useQueue.ts:29-33` — `queue.next()` advances `index` before fetching the video; if fetch fails/returns missing, index has already moved, desyncing queue position. Fix: only advance on confirmed success, or retry-in-place.
- [ ] `src/main/services/resolver.ts:95-105` — `inFlight` dedup map: a forced refresh's `.finally` can delete a newer, still-pending entry for the same id, defeating dedup. Fix: only delete from map if it still holds the same promise reference.
- [ ] `src/main/services/downloader.ts:118-124,200` — Failed downloads leave orphan `.jpg`/`.info.json` sidecar files; `completedCount++` also increments on failure/skip, conflating failures with successes in reported totals. Fix: clean up sidecars on failure, count failures separately.
- [ ] `src/renderer/src/components/settings/DownloadsSettings.vue:164` — `watch(sync.state.completed)` fires 4 parallel `videosList` calls per single completed increment during an active sync. Fix: debounce.
- [ ] `src/main/db/videos.ts:66-69` (`search`) — LIKE pattern has no `ESCAPE` clause; user-typed `%`/`_` act as wildcards (functional quirk only, queries are parameterized so no injection). Fix: escape or add `ESCAPE` clause.
- [ ] `src/main/services/collections.ts:11` + `src/main/services/purge.ts:25` — `.mp4→.info.json` sidecar path derived via extension replace; a non-mp4 adopted file silently skips cleanup, and `covers/` subdir thumbnails aren't cleaned when the tracked thumb lives there. Fix: extension-agnostic sidecar lookup + cover cleanup path.
- [ ] `src/main/db/videos.ts:135-156` + `src/main/services/importer.ts:48-61` — 3 SQL statements per imported row (redundant existence SELECT before `upsertVideo`'s own SELECT+write), doubling read load on large imports. Fix: single upsert that returns whether it was an insert or update.
- [ ] `src/renderer/src/components/player/PlayerDock.vue:68,226` — `scrubbing` ref set on mousedown/mouseup but never read; no actual drag-scrub implemented (click-to-seek only). Fix: implement drag-scrub using the ref, or remove the dead state.
- [ ] `src/renderer/src/stores/library.ts:12` — `localStorage.getItem` not wrapped in try/catch (throws in some sandboxed/private-browsing-like contexts). Fix: wrap in try/catch with fallback default.
