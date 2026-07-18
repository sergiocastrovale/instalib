# Building with GitHub Actions

Cross-OS builds require a CI matrix — each installer format (`.exe`, `.zip`, `.AppImage`) can only be built on its matching OS (electron-builder / OS-tooling limitation). GitHub Actions gives free `ubuntu-latest` / `windows-latest` / `macos-latest` runners for exactly this.

Workflow file: [`.github/workflows/build.yml`](../.github/workflows/build.yml)

## 1. Trigger

```yaml
on:
  push:
    tags:
      - "v*"
  workflow_dispatch:
```

Runs on version tags (`v0.1.0`, `v1.2.3`, ...) and manually via the Actions tab (`workflow_dispatch`). Doesn't run on every push/PR — that's already covered by `test.yml`; builds are slow and only needed for releases.

## 2. Matrix

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - os: ubuntu-latest
        script: dist:linux
      - os: windows-latest
        script: dist:win
      - os: macos-latest
        script: dist:mac
```

`fail-fast: false` so a Windows failure doesn't cancel the in-progress macOS/Linux jobs — you want all three results.

## 3. Per-job steps

```yaml
runs-on: ${{ matrix.os }}
steps:
  - uses: actions/checkout@v5
  - uses: actions/setup-node@v5
    with:
      node-version: 22
      cache: npm
  - run: npm ci
  - run: npm run ${{ matrix.script }}
  - uses: actions/upload-artifact@v5
    with:
      name: instalib-${{ matrix.os }}
      path: |
        dist/*.exe
        dist/*.zip
        dist/*.AppImage
      if-no-files-found: error
```

`npm ci` triggers `postinstall` → `electron-builder install-app-deps`, rebuilding `better-sqlite3`'s native binary against Electron's ABI **for that runner's OS** — this is the whole reason the matrix exists, a Linux-built `.node` file won't load on Windows.

`npm run dist:<os>` = `electron-vite build` + `electron-builder --<os>` (see `package.json` scripts). Output lands in `dist/`, matching `electron-builder.yml`'s `directories.output`.

## 4. Release job

```yaml
release:
  needs: build
  if: startsWith(github.ref, 'refs/tags/v')
  runs-on: ubuntu-latest
  permissions:
    contents: write
  steps:
    - uses: actions/download-artifact@v5
      with:
        path: artifacts
    - uses: softprops/action-gh-release@v2
      with:
        files: artifacts/**/*
        draft: true
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Pulls all three matrix artifacts down and attaches them to a **draft** GitHub Release named after the tag. The release body is not hand-written: the job checks out the repo and an `awk` step slices that version's section out of `CHANGELOG.md` into `RELEASE_NOTES.md`, passed as `body_path`. Missing section → the job fails rather than publishing an empty release. Draft so you can still review/edit before publishing — flip to `draft: false` if you want it auto-published.

## Cutting a release

```bash
npm run version:bump   # bumps package.json, regenerates CHANGELOG.md, commits, tags
git push --follow-tags
```

Push the tag → build matrix runs → draft release created with all 3 installers attached and notes filled in from the changelog → review on GitHub → publish.

Only Conventional Commits (`feat:`, `fix:`, `refactor:`, …) reach the changelog — see [dev.md](dev.md#changelog--releases).

Or trigger manually without a tag via Actions tab → "Build" → "Run workflow" (artifacts only, no release job — that's gated on the tag ref).

## Known gaps

- **Unsigned.** `mac.identity: null`, `hardenedRuntime: false`, no Windows cert — macOS Gatekeeper and Windows SmartScreen will warn end users (see [dev.md](dev.md#running-a-packaged-build-while-developing)). Signing needs an Apple Developer cert (macOS) and a code-signing cert (Windows), both out of scope until you have them.
- **No build cache for native deps** — every run rebuilds `better-sqlite3` from source. Fine at this scale; revisit with `actions/cache` on `node_modules` if CI time becomes a problem.
