# Test Coverage Implementation Guide

Complete plan for adding full test coverage (unit + e2e) to Instalib. Written as a handoff document: everything an implementing agent needs is in this file plus the referenced source files. **No tests, test tooling, or CI exist yet** — this is a greenfield setup.

## App overview (as relevant to testing)

Electron 33 desktop app (Instagram saved-videos library), built with electron-vite 3. TypeScript strict throughout.

- `src/main/` — Node/Electron main process: SQLite DB layer (better-sqlite3, raw SQL), services (import, download via yt-dlp subprocess, playback resolution, covers), custom `app-media://` protocol with byte-range streaming.
- `src/preload/` — typed `window.api` context bridge over `ipcRenderer.invoke` (`PreloadApi` type in `src/preload/index.ts`).
- `src/renderer/src/` — Vue 3.5 + Pinia + vue-router (hash history), Tailwind 4, reka-ui.
- `src/shared/` — DTO types (`types.ts`) and IPC channel constants (`ipc-channels.ts`).

## Verified constraints (do not skip — these shape everything)

1. **better-sqlite3 ABI mismatch.** `postinstall` runs `electron-builder install-app-deps`, so the native module in `node_modules` is compiled for Electron's Node ABI, not system Node. Plain `vitest` under system Node fails with `NODE_MODULE_VERSION` errors. **Solution: run Vitest through Electron's Node**: `ELECTRON_RUN_AS_NODE=1 electron node_modules/vitest/vitest.mjs`. Under that flag, `require('electron')` returns a path string — so alias the `electron` module to a mock in vitest config (needed anyway for `app.getPath`).
2. **E2E data-dir isolation seam already exists.** `src/main/index.ts` calls `resolvePortableDataDir()` (`src/main/portable.ts`) which honors env var `PORTABLE_EXECUTABLE_DIR` → userData becomes `<dir>/Instalib-Data`. Playwright launches with this env var pointing at a temp dir. **No production change needed for isolation.**
3. **Setup gate.** Router guard (`src/renderer/src/router.ts` `beforeEach`) redirects to `/setup` unless binaries exist. `binariesReady()` in `src/main/services/binaries.ts` just checks `existsSync(<userData>/bin/yt-dlp)` and `.../ffmpeg`. E2E pre-seeds stub executables (shell/node scripts, `chmod +x`). Scope e2e to Linux/macOS (no `.exe` stubs needed).
4. **Startup cover fetch.** `src/main/index.ts` auto-starts yt-dlp cover fetching if any video lacks a thumbnail. E2E seed data must set `thumbPath` on **every** seeded video to keep startup quiet and deterministic.
5. **Module-level singletons.** `getDb()` cache (`src/main/db/index.ts`), `usePlayer.ts` reactive `state` at module scope, `resolver.ts` `inFlight` map, `downloader.ts` job state (`running`, counters). Tests use `vi.resetModules()` + dynamic `import()` per test where state must reset, plus the `closeDb()` seam below.

## Production-code changes (exactly these, nothing more)

1. `src/main/db/index.ts` — add `export function closeDb(): void` that closes and nulls the cached `db`. Lets DB tests cycle a fresh temp DB per test. Also call it on app shutdown if convenient.
2. `src/main/services/resolver.ts` — `parseExpiryFromUrl` is module-private; export it for direct unit testing.
3. `package.json` — devDeps + scripts only (below). No other refactors.

### devDeps to add

`vitest`, `@vitest/coverage-v8`, `happy-dom`, `@vue/test-utils`, `@pinia/testing`, `@playwright/test`, `cross-env`

### npm scripts to add

```json
"test:unit": "cross-env ELECTRON_RUN_AS_NODE=1 electron node_modules/vitest/vitest.mjs run",
"test:unit:watch": "cross-env ELECTRON_RUN_AS_NODE=1 electron node_modules/vitest/vitest.mjs",
"coverage": "cross-env ELECTRON_RUN_AS_NODE=1 electron node_modules/vitest/vitest.mjs run --coverage",
"test:e2e": "npm run build && playwright test",
"test": "npm run test:unit && npm run test:e2e"
```

## Phase 1 — Infra bootstrap

Create:

- **`vitest.config.ts`** (root; do NOT touch `electron.vite.config.ts`). Use `test.projects` with two inline projects:
  - **main**: `environment: 'node'`, include `tests/unit/main/**/*.test.ts` + `tests/unit/shared/**`, aliases: `@shared` → `src/shared`, `electron` → `tests/mocks/electron.ts`.
  - **renderer**: `environment: 'happy-dom'`, plugins `[vue()]`, include `tests/unit/renderer/**/*.test.ts`, aliases: `@` → `src/renderer/src`, `@shared` → `src/shared`; `setupFiles: ['tests/setup/renderer.setup.ts']`.
  - Coverage: v8 provider, **report only, no thresholds**. Exclude: `src/renderer/src/components/ui/**` (vendored shadcn-vue), `src/preload/**` (thin passthrough, covered by e2e), `src/main/index.ts`, `src/main/window.ts`, `out/**`.
- **`tests/mocks/electron.ts`** — mock `app` (`getPath` backed by settable map, export `__setUserDataDir(dir)` helper; default paths → per-run temp dirs), `protocol` (`registerSchemesAsPrivileged` no-op; `handle` captures the handler so protocol tests can invoke it), `ipcMain`, `nativeTheme`, `dialog`, `shell`, minimal `BrowserWindow`.
- **`tests/mocks/window-api.ts`** — `createApiMock(): PreloadApi` (type from `src/preload/index.ts`), every method `vi.fn()` with sensible defaults (`videosList` → `[]`, `setupStatus` → binaries-ready, etc.).
- **`tests/setup/renderer.setup.ts`** — assigns fresh api mock to `window.api` before each test.
- **`tests/helpers/db.ts`** — `withTempDb()`: sets mock userData to fresh temp dir, dynamic-imports db modules, returns disposer that calls `closeDb()` + removes temp dir.

Modify: `package.json`, `src/main/db/index.ts`, `src/main/services/resolver.ts` (per above).

**Gate before proceeding**: write one smoke test that imports `getDb()` and runs a query; `npm run test:unit` must pass. This proves the ABI strategy. Fallback if vitest worker processes misbehave under `ELECTRON_RUN_AS_NODE`: set `test.pool: 'forks'` with `poolOptions.forks.singleFork: true`.

## Phase 2 — Fixtures + pure-function tests

**Fixtures** (`tests/fixtures/`):
- `saved_posts.old.json` (string_map_data / string_list_data shapes), `saved_posts.new.json` (2025 export: label_values + Owner dict), `saved_collections.old.json`, `saved_collections.new.json`, malformed variants. Model on the parsing branches in `src/main/services/instagram.ts`.
- `export.zip` (nested `your_instagram_activity/saved/saved_posts.json` + `saved_collections.json`) and `export-no-posts.zip` — generate via a checked-in `scripts/make-fixtures.mjs` using adm-zip.
- `tiny.mp4` (few KB, valid moov atom — generate once with ffmpeg, commit binary), `cover.jpg`.

**Tests**:
- `tests/unit/main/instagram.test.ts` — `extractShortcode` (`/p/`, `/reel/`, `/tv/`, query strings, no-match → null), `parseSavedPosts` (old, new, array root, missing href, timestamp seconds), `parseSavedCollections` (old, new, unnamed skipped, malformed → `[]`).
- `tests/unit/main/downloader.slug.test.ts` — `slug()`: unicode, truncation to 60, leading/trailing dashes stripped, empty → `'unknown'`.
- `tests/unit/main/resolver.parseExpiry.test.ts` — valid hex `oe=` param, missing param → fallback TTL, invalid hex.
- `tests/unit/main/fs-utils.test.ts` — `infoJsonPath()` extension edge cases.
- `tests/unit/main/portable.test.ts` — `resolvePortableDataDir()` all 4 branches: `PORTABLE_EXECUTABLE_DIR`, `APPIMAGE`, darwin non-/Applications `.app` path (override `process.platform` with `Object.defineProperty`, env with `vi.stubEnv`), null default.
- `tests/unit/renderer/format.test.ts` — `formatDuration` (h:mm:ss vs m:ss, rounding), `formatDate`.
- `tests/unit/renderer/listQuery.test.ts` — all/favorites/collection mappings.

## Phase 3 — DB layer tests (real sqlite via temp dirs / :memory:)

- `db/migrations.test.ts` — fresh `new Database(':memory:')` + `runMigrations`: reaches `user_version` 2, idempotent on re-run, v2 drops `learned` column.
- `db/videos.test.ts` — `upsertVideo` inserted-vs-updated detection (ON CONFLICT(shortcode)); `listVideos` filters + **LIKE-escaping** of `%`/`_`/`\` in search + sort orders; `patchVideo` field-selective updates, `last_played_at` set on position change, no-op on empty patch; `setDownloadResult` COALESCE semantics (status-only update preserves filePath); `setResolvedUrl`/`getResolvedUrl`/`clearResolvedUrl`; `resetStaleDownloads` flips downloading→pending.
- `db/collections.test.ts` — `getSyncScopeWhere` 3 branches (validate by executing produced SQL against seeded rows — mirrors usage in `downloader.ts` `findNextPending`); `deleteCollectionAndOrphanVideos` (orphan = favorite=0 AND member of exactly one collection); `listCollections` video_count + cover subqueries + ordering; `upsertImportedCollection` dedupe; `addVideoToCollection` INSERT OR IGNORE.
- `db/settings.test.ts` — defaults (theme coercion, `syncFolder` fallback to `app.getPath('videos')/Instalib`), `setSettings` round-trip, null handling.

Use `withTempDb()` from Phase 1 for anything touching `getDb()`.

## Phase 4 — Services with side effects + protocol

Mock `node:child_process` with `vi.mock` — scripted fake ChildProcess (EventEmitter with stdout/stderr streams) per test. Real temp DB underneath.

- `resolver.test.ts` — `resolvePlayback` decision tree: local file exists → `app-media://` source; cached unexpired URL respected (incl. ~10-min refresh margin); yt-dlp JSON success → `web` source + `setResolvedUrl` + `backfillMetadata`; nonzero exit / unparsable JSON → `embed` fallback with shortcode URL; **in-flight dedupe** (two concurrent calls → one spawn); `force=true` bypass.
- `importer.test.ts` — `importFromPath` with real fixture files: ZIP branch, bare-JSON branch, missing `saved_posts.json` → throws, corrupt ZIP → throws, collection linking (incl. shortcode already in DB), returned counts. `vi.mock` `./covers` and `./adopt`.
- `downloader.test.ts` — `downloadOne` stderr classification (skip-patterns like "no video formats found"/carousel → `skipped`; other → `failed` + partial-file cleanup); success path reads `.info.json` duration; retry loop with `vi.useFakeTimers`; `requestStop` kills current proc.
- `services/collections.test.ts` — `deleteCollection` deletes DB rows + orphan files on disk (temp files).
- `purge.test.ts` — `purgeDatabase` per `PurgeOptions` variants.
- `protocol.test.ts` — via captured `protocol.handle` handler from the electron mock, invoke with real `Request` objects against a temp file: no Range → 200 full body; `bytes=0-99` → 206 + correct Content-Range; open-ended `bytes=100-`; start beyond EOF → 416; malformed header → 416; unknown host / missing video id → 404.

## Phase 5 — Renderer stores, composables, components

- `stores/library.test.ts` — `continueWatching` (positionSec>5, position/duration<0.95, lastPlayedAt desc, top 10), `favoritesCount`, cover getters (`mostRecentCoverId` etc.), `refresh` dedupe (two concurrent calls → one `window.api.videosList`), `toggleSidebar` localStorage persist + init read (key `instalib.sidebar.collapsed`; store guards localStorage with try/catch — test that too), `patchVideoLocal`.
- `stores/search.test.ts` — `normalizedQuery`, `hasQuery`.
- `composables/useQueue.test.ts` — `shuffleArray` (same membership, same length), next/prev/hasNext/setIndexById. Module-level singleton — `vi.resetModules()` between tests.
- `composables/usePlayer.test.ts` — biggest renderer target (334 lines). `vi.resetModules()` + dynamic import per test; happy-dom `HTMLVideoElement` with `play()` stubbed to resolve. Cover: `setSpeed` clamp 0.25–2, `setVolume` clamp + unmute, loop A/B jump-back in `onTimeUpdate`, resume in `onLoadedMetadata` (seek only when >5s and <95%), `onEnded` queue advance, web-source `onVideoError` single forced re-resolve, progress persistence timer (fake timers → assert `window.api` patch call).
- `useSyncProgress.test.ts` (`handleEvent` reducer), `useVideoFilters.test.ts` (author filter, text search, sort parse), `useCoverStatus.test.ts` (`coverStatusText`), `usePlayerHotkeys.test.ts` (keymap dispatch; ignored while typing in inputs).
- **Components** (mount with `@vue/test-utils` + `createTestingPinia`; stub lucide icons loosely): `ImportDropzone.vue` (file input → import called, `imported` emit, error toast path), `VideoCard.vue`, `QueueList.vue`, `ConfirmDialog.vue`, `TopBar.vue`, `AppSidebar.vue`. **Skip `components/ui/**`** (vendored).
- `router.test.ts` — `beforeEach` guard: `setupStatus` missing binaries → redirect `/setup`; ready → pass; api throws → pass through; `to.name === 'setup'` short-circuits.

## Phase 6 — Playwright e2e

Create:
- **`playwright.config.ts`** — `testDir: 'tests/e2e'`, `workers: 1`, `trace: 'on-first-retry'`. No browser installs needed (Electron binary used directly).
- **`tests/e2e/stubs/yt-dlp`** and **`ffmpeg`** — `#!/usr/bin/env node` scripts: print a version string for `--version`, else exit 1 fast. Copied into `<tmp>/Instalib-Data/bin/` + `chmod +x`.
- **`tests/e2e/helpers/launch.ts`** — Playwright fixture:
  1. Create temp dir.
  2. Optionally copy stub binaries into `<tmp>/Instalib-Data/bin/`.
  3. Optionally seed DB: `execFileSync(electronBin, ['tests/e2e/helpers/seed.mjs', dataDir], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } })` (must run under Electron's Node — same ABI issue).
  4. `_electron.launch({ args: ['out/main/index.js'], env: { ...process.env, PORTABLE_EXECUTABLE_DIR: tmp } })`.
  5. Return `{ app, page, dataDir }`; teardown closes app + removes temp dir.
- **`tests/e2e/helpers/seed.mjs`** — opens `<dataDir>/Instalib-Data/instalib.db` with better-sqlite3, creates schema (duplicate the CREATE statements from `src/main/db/migrations.ts` with a comment noting they mirror it; set `user_version=2` so app migrations no-op). Seeds: ~15 videos — **all with `thumbPath`** pointing at fixture `cover.jpg` (suppresses startup cover fetch), 2 with `filePath` → fixture `tiny.mp4` and status `downloaded`, mixed favorites/positions/statuses (pending/downloaded/failed); 2 collections + memberships; settings rows.

Specs:
1. `setup-gate.spec.ts` — launch without stubs → lands on `#/setup`; with stubs → library renders.
2. `import.spec.ts` — dropzone `setInputFiles(export.zip)` → toast + grid populated. If `webUtils.getPathForFile` rejects Playwright's synthetic files, fall back to `page.evaluate(p => window.api.importZip(p), zipPath)` — still exercises IPC → importer → DB → UI refresh.
3. `library.spec.ts` — seeded: grid count, search filter, status/favorite filters, sort, favorite toggle persists across relaunch (relaunch with same dataDir).
4. `collections.spec.ts` — sidebar lists seeded collections, collection page, delete with confirm dialog → orphan handling reflected in UI.
5. `watch.spec.ts` — open local video → `<video>` src is `app-media://video/<id>` (exercises byte-range protocol for real), playback starts, seek → navigate away → back → resumes; hotkeys (space play/pause, arrows seek, `f` favorite); queue next/prev.
6. `settings.spec.ts` — theme toggle, purge dialog → grid empties, setup settings show stub versions.

Platform: Linux (WSLg provides display on the dev box) and macOS. CI uses xvfb.

## Phase 7 — CI

**`.github/workflows/test.yml`** — on push/PR, ubuntu-latest:
1. checkout, setup-node
2. `npm ci` (postinstall rebuilds better-sqlite3 for Electron)
3. `npm run typecheck`
4. `npm run test:unit`
5. `xvfb-run -a npm run test:e2e`
6. Upload playwright traces/report on failure.

No `playwright install` step needed (Electron ships Chromium).

## Phase ordering

| Phase | Content | Effort |
|---|---|---|
| 1 | Infra + seams + smoke test | S |
| 2 | Fixtures + pure fns | M |
| 3 | DB layer | M |
| 4 | Services + protocol | L |
| 5 | Renderer | L |
| 6 | E2E | L (highest risk) |
| 7 | CI | S |

Phases 2–5 are independent after Phase 1. Phase 6 needs Phase 1 fixtures + `npm run build`.

## Verification

- Phase 1 gate: smoke test green (proves better-sqlite3 loads under test runner) **before writing more tests**.
- Each phase: `npm run test:unit` and `npm run typecheck` stay green.
- Phase 6: `npm run test:e2e` twice back-to-back → deterministic; temp dirs cleaned.
- Final: `npm test` full pass, then `npm run dev` still boots (confirms native module ABI untouched).

## Decisions already made (don't re-ask)

- Vitest for unit, Playwright `_electron` for e2e.
- CI workflow: yes (Phase 7).
- Coverage: **report only**, no threshold enforcement — add thresholds later once baseline known.
- Only 3 production-code touches (listed above); no refactors for testability beyond them.
