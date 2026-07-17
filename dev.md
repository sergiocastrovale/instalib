# Developer guide

Build and package Instalib for Windows, macOS, and Linux.

## Requirements

- Node 22+ and npm
- No extra SDKs needed for plain development. Packaging portable builds has
  per-OS caveats - see below.

## Setup

```bash
npm install
```

`postinstall` runs `electron-builder install-app-deps`, which rebuilds
`better-sqlite3`'s native binary against Electron's Node ABI (not your system
Node's). 

If builds ever start failing with a `NODE_MODULE_VERSION` mismatch
error, rerun this manually:

```bash
npx electron-builder install-app-deps
```

## Develop

```bash
npm run dev          # hot-reload dev window
npm run typecheck    # main/preload (tsc) + renderer (vue-tsc)
npm run build        # bundles to out/, no packaging - fastest way to sanity check a build
```

## Package portable builds

Each format can only be built on its matching OS - this is an
electron-builder / OS-tooling limitation, not something this project works
around. Cross-building Windows from Linux is possible with `wine` installed,
but isn't set up or tested here; macOS builds require a real Mac (Apple's
codesigning tools aren't available elsewhere). If you need all three, use a
CI matrix (GitHub Actions with `ubuntu-latest` / `windows-latest` /
`macos-latest` runners, each running its own `npm ci && npm run dist:<os>`).

```bash
npm run dist:linux   # AppImage (portable)
npm run dist:win     # portable .exe
npm run dist:mac     # .zip (portable)
```

For fast local iteration without building a full package:

```bash
# or --mac / --linux
npx electron-builder --win --dir
```

This produces an unpacked, runnable app under `dist/<platform>-unpacked/` in
seconds - use it to sanity-check packaging changes before running the slow
full `dist:*` commands.

## Run a build

Artifacts land in `dist/`. How to run them per OS:

**Linux**

```bash
# AppImage - portable, no install
chmod +x dist/Instalib-*.AppImage
./dist/Instalib-*.AppImage
# If it errors about FUSE (common in containers/WSL):
./dist/Instalib-*.AppImage --appimage-extract-and-run
```

**Windows**

```powershell
# Portable - just run it, nothing installed
dist\Instalib-*-portable.exe
```
SmartScreen will warn it's unrecognized (unsigned) - "More info" → "Run anyway".

**macOS**

```bash
# .zip - unzip, then run the .app directly (portable, no install)
unzip dist/Instalib-*-mac.zip -d dist/
open dist/Instalib.app
```
Gatekeeper will block the unsigned app first launch - right-click → **Open**,
or if that option is missing (macOS 15+): `xattr -dr com.apple.quarantine /path/to/Instalib.app`

First launch on any OS downloads yt-dlp + ffmpeg automatically (needs internet, ~1-2 min, one-time).

### Signing

Nothing is code-signed (`mac.identity: null`, no Windows cert configured).

Users get Gatekeeper/SmartScreen warnings - this is fine.

## Quirks that will bite you

These are real issues hit while building this app - not hypotheticals.

- **nanoid v5 is ESM-only.** Requiring it from the main-process CJS bundle
  throws `ERR_REQUIRE_ESM` at runtime (only surfaces once packaged/run, not at
  typecheck time). We use `node:crypto`'s `randomUUID()` instead - don't
  reintroduce nanoid (or any ESM-only package) in `src/main`/`src/preload`.
- **Don't track download progress with a parallel stream listener.**
  Attaching `.on('data', ...)` to a Readable *and* also passing it to
  `pipeline()` races - the first chunk(s) get consumed by whichever listener
  the event loop favors, silently corrupting the output at the first
  chunk-boundary (byte 16384) while total size stays coincidentally correct.
  Track progress via a `Transform` placed *inside* the pipeline instead (see
  `src/main/services/binaries.ts`).
- **Don't hand-restrict electron-builder's `files:` list.** A narrow
  whitelist here previously excluded `@electron-toolkit/utils`/`preload` from
  the packaged asar and crashed the built app on launch with `Cannot find
  module`. Let electron-builder's default dependency-tree walk include
  `dependencies` from `package.json` - only add `files` entries for things
  genuinely outside that (we only need it for `out/**`).
- **userData folder name comes from `package.json`'s `name` field, not
  `productName`.** Ours is lowercase `instalib`, so the OS profile path is
  `~/.config/instalib` (Linux), not `~/.config/Instalib`. Don't assume the
  capitalized product name when hunting for the data directory by hand.
- **Portable mode relies on env vars electron-builder's runtime sets**:
  `PORTABLE_EXECUTABLE_DIR` (Windows portable target) and `APPIMAGE` (Linux
  AppImage). `src/main/portable.ts` reads these to relocate
  `app.setPath('userData', ...)` next to the executable. This call **must**
  happen before `app.whenReady()` - Electron ignores `setPath` after ready.
- **AppImages need FUSE to run directly**, which many containers/WSL setups
  lack. To test one without FUSE: `./Instalib-*.AppImage --appimage-extract`,
  then run `./squashfs-root/instalib` directly.
- **better-sqlite3's compiled `.node` file must stay unpacked from the
  asar** (`asarUnpack: ['**/*.node']` in `electron-builder.yml`) - Node can't
  `dlopen()` a native binding from inside an asar archive.
