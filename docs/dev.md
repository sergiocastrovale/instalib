# Developer guide

## Requirements

- Node 22+ and npm
- No extra SDKs for plain development
- macOS builds require a real Mac (Apple's codesigning tools aren't available elsewhere)
- Windows/Linux builds can be made on either OS; cross-building from the other with `wine` is possible but not set up or tested here
- Nothing is code-signed (`mac.identity: null`, no Windows cert configured)

## Setup

```bash
npm install
```

`postinstall` runs `electron-builder install-app-deps`, which rebuilds `better-sqlite3`'s native binary against Electron's Node ABI (not your system Node's).

If builds start failing with a `NODE_MODULE_VERSION` mismatch, rerun that manually:

```bash
npx electron-builder install-app-deps
```

## Run locally

```bash
npm run dev          # hot-reload dev window
npm run typecheck    # main/preload (tsc) + renderer (vue-tsc)
npm run build        # bundles to out/, no packaging - fastest way to sanity check a build
```

## Building

Each installer format can only be built on its matching OS (electron-builder / OS-tooling limitation). For all three platforms, use a CI matrix (GitHub Actions with `ubuntu-latest` / `windows-latest` / `macos-latest` runners, each running `npm ci && npm run dist:<os>`).

```bash
npm run dist:linux   # AppImage (portable)
npm run dist:win     # portable .exe
npm run dist:mac     # .zip (portable)
```

Artifacts land in `dist/`.

For fast local iteration without a full package build:

```bash
npx electron-builder --win --dir   # or --mac / --linux
```

Produces an unpacked, runnable app under `dist/<platform>-unpacked/` in seconds - use it to sanity-check packaging changes before running the slower `dist:*` commands.

### Running a packaged build while developing

- **Linux AppImage needs FUSE**, often missing in containers/WSL. Without it: `./Instalib-*.AppImage --appimage-extract-and-run`, or extract once with `--appimage-extract` and run `./squashfs-root/instalib` directly.
- **macOS**: unsigned, so Gatekeeper blocks it. Right-click → Open, or on macOS 15+ if that option is missing: `xattr -dr com.apple.quarantine /path/to/Instalib.app`.
- **Windows**: unsigned, so SmartScreen warns. "More info" → "Run anyway".

(End users hit the same prompts - see the main [README](../README.md) for the user-facing version of these steps.)

## Changelog & releases

`CHANGELOG.md` is generated from commit messages, so **write [Conventional Commits](https://www.conventionalcommits.org)** (`feat:`, `fix:`, `perf:`, `refactor:`, `build:`, `ci:`, `docs:`). `test:`/`style:`/`chore:` are deliberately hidden; anything not matching the format is dropped entirely.

Cutting a release:

```bash
npm run version:bump   # minor - or version:bump:major
git push --follow-tags
```

`npm version`'s `version` lifecycle hook runs `npm run changelog` and stages the result, so the new section lands *inside* the version commit that gets tagged.

Pushing the `v*` tag triggers `.github/workflows/build.yml`: it builds all three installers, extracts that version's section from `CHANGELOG.md`, and opens a **draft** GitHub Release with those notes plus the artifacts. Review and publish it by hand.

Regenerate without bumping: `npm run changelog` (append `-- -r 0` to rebuild the whole file from scratch). Section grouping lives in `changelog.config.mjs`.

## Quirks that will bite you

- **nanoid v5 is ESM-only.** Requiring it from the main-process CJS bundle throws `ERR_REQUIRE_ESM` at runtime (only surfaces once packaged/run, not at typecheck time). We use `node:crypto`'s `randomUUID()` instead - don't reintroduce nanoid (or any ESM-only package) in `src/main`/`src/preload`.
- **Don't track download progress with a parallel stream listener.** Attaching `.on('data', ...)` to a Readable *and* also passing it to `pipeline()` races - the first chunk(s) get consumed by whichever listener the event loop favors, silently corrupting the output at the first chunk-boundary (byte 16384) while total size stays coincidentally correct. Track progress via a `Transform` placed *inside* the pipeline instead (see `src/main/services/binaries.ts`).
- **Don't hand-restrict electron-builder's `files:` list.** A narrow whitelist here previously excluded `@electron-toolkit/utils`/`preload` from the packaged asar and crashed the built app on launch with `Cannot find module`. Let electron-builder's default dependency-tree walk include `dependencies` from `package.json` - only add `files` entries for things genuinely outside that (we only need it for `out/**`).
- **userData folder name comes from `package.json`'s `name` field, not `productName`.** Ours is lowercase `instalib`, so the OS profile path is `~/.config/instalib` (Linux), not `~/.config/Instalib`. Don't assume the capitalized product name when hunting for the data directory by hand.
- **Portable mode relies on env vars electron-builder's runtime sets**: `PORTABLE_EXECUTABLE_DIR` (Windows portable target) and `APPIMAGE` (Linux AppImage). `src/main/portable.ts` reads these to relocate `app.setPath('userData', ...)` next to the executable. This call **must** happen before `app.whenReady()` - Electron ignores `setPath` after ready.
- **A non-conventional commit subject vanishes from the changelog.** Nothing enforces the format (no husky/commitlint here), so a `fixed the thing` commit ships fine but never appears in the release notes. Check `npm run changelog` output before tagging.
- **`conventional-changelog-conventionalcommits` is pinned to v8.** v10 renders empty sections with `conventional-changelog-cli` v5 - headings appear, every commit is silently dropped. Don't let a dependency bump move it.
- **better-sqlite3's compiled `.node` file must stay unpacked from the asar** (`asarUnpack: ['**/*.node']` in `electron-builder.yml`) - Node can't `dlopen()` a native binding from inside an asar archive.
