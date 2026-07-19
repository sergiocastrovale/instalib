## [1.2.1](https://github.com/sergiocastrovale/instalib/compare/v1.2.0...v1.2.1) (2026-07-19)

### Features

* add export help link to import settings ([d42c87f](https://github.com/sergiocastrovale/instalib/commit/d42c87f90133270bef9f4dc9515729443ff5cfa9))

### Documentation

* update docs ([e437de8](https://github.com/sergiocastrovale/instalib/commit/e437de888434a51e7ef415f27cc06dd33d27aaa4))

## [1.2.0](https://github.com/sergiocastrovale/instalib/compare/v1.1.0...v1.2.0) (2026-07-18)

### Refactoring

* split setup checks into own card, fix sync refresh ([8c03621](https://github.com/sergiocastrovale/instalib/commit/8c036216c7631764000338a6667c92e7bef48e19))

## [1.1.0](https://github.com/sergiocastrovale/instalib/compare/v1.0.0...v1.1.0) (2026-07-18)

### Features

* add export instructions dialog to library empty state ([3acaa9a](https://github.com/sergiocastrovale/instalib/commit/3acaa9aede4ef5cf195227edd3c4eba80bf228e1))

### Bug Fixes

* refresh library store after database purge ([817d358](https://github.com/sergiocastrovale/instalib/commit/817d358820483b2f77e3aaca3ec7e356a9296a65))

### Documentation

* minor adjustments ([752b25f](https://github.com/sergiocastrovale/instalib/commit/752b25f0daa7aded4547fe55f80940e92dcdcb2f))

## [1.0.0](https://github.com/sergiocastrovale/instalib/compare/c795eaa1cc8c81087a866fa3642a7e9af872fdfd...v1.0.0) (2026-07-17)

### Features

* add responsive mobile nav and search ([eb862dc](https://github.com/sergiocastrovale/instalib/commit/eb862dc2c0cb1c053189a9ec15ada62301a6f1ea))
* initial commit ([c795eaa](https://github.com/sergiocastrovale/instalib/commit/c795eaa1cc8c81087a866fa3642a7e9af872fdfd))
* reskin app with sidebar and breadcrumbs ([6d0be23](https://github.com/sergiocastrovale/instalib/commit/6d0be23f91aae7b48532f402bf730c9c1d82877d))
* show download counts and stop pre-selecting sync targets ([aa8620b](https://github.com/sergiocastrovale/instalib/commit/aa8620b668ef0f4849ee72f4bc4907bb819db2db))

### Bug Fixes

* catch errors in SettingsPage load/refreshCoverStatus ([5f04609](https://github.com/sergiocastrovale/instalib/commit/5f046092c7f8fce175e2e268d078890b51d5bee6))
* catch malformed ZIP/JSON in import instead of throwing raw error ([104db47](https://github.com/sergiocastrovale/instalib/commit/104db47aa4b6d88e16dc536956b7d7e63c8ed0b4))
* catch setupStatus rejection in router guard ([4e00431](https://github.com/sergiocastrovale/instalib/commit/4e0043150d58e271ee52d7155cbf4bdc3f7064ce))
* clean up sidecar files on download failure, track failures separately ([cc4383b](https://github.com/sergiocastrovale/instalib/commit/cc4383b982d72e426bb72f74776f7d5e9a15528f))
* debounce refreshCounts on sync completed changes ([456393a](https://github.com/sergiocastrovale/instalib/commit/456393aeecf165c5f0d3856c064f87e1f4376709))
* disable electron-builder auto-publish in CI dist scripts ([6719034](https://github.com/sergiocastrovale/instalib/commit/67190340fa458b920db7a6533c0ce32c69723e38))
* download yt-dlp to temp file before atomic rename ([3547f1b](https://github.com/sergiocastrovale/instalib/commit/3547f1be157d06fb779bba27d5c2898ca1663f58))
* escape LIKE wildcards in video search ([af47d9e](https://github.com/sergiocastrovale/instalib/commit/af47d9e9e7d83c35194ae19e6f205fb2aeb049f6))
* extension-agnostic sidecar lookup, clean up orphaned covers/ thumbnails ([a1664dc](https://github.com/sergiocastrovale/instalib/commit/a1664dc5e55770f68069f2e662e6586355d48b32))
* flush pending notes save on unmount and video change ([8ecb561](https://github.com/sergiocastrovale/instalib/commit/8ecb56162e3f23b04fad895f1903cdf0f79068c6))
* guard applySource against stale video after async resolve ([ccd837b](https://github.com/sergiocastrovale/instalib/commit/ccd837b66051b782ed1611e3f40343a2deffe74f))
* guard localStorage access in library store with try/catch ([98c2acd](https://github.com/sergiocastrovale/instalib/commit/98c2acd64717db6805083cbf53d154305ada7eca))
* guard WatchPage against stale video fetches, add not-found state ([3b0d5ca](https://github.com/sergiocastrovale/instalib/commit/3b0d5cab5525b1b45a39239cc06f10da48d2a549))
* handle rejection in library store refresh ([1a29fa8](https://github.com/sergiocastrovale/instalib/commit/1a29fa8769c9923c7ea8e135bcaa176553e56494))
* import vue-sonner stylesheet for toast layout/colors ([49d9773](https://github.com/sergiocastrovale/instalib/commit/49d9773d82064d307c4a4738b5545ccc46e85b72))
* keep favorites/covers in sync after video edits ([dee2907](https://github.com/sergiocastrovale/instalib/commit/dee2907dbf33fbee01e841aeaaa75d7a55ce4150))
* keep search bar from overlapping topbar actions ([5cdfddf](https://github.com/sergiocastrovale/instalib/commit/5cdfddf8d4deb1dde4453964ceff22b6ce61c571))
* kill running yt-dlp process on stop/quit, await it before purge ([b0352df](https://github.com/sergiocastrovale/instalib/commit/b0352df55fee01642483a9cf1be72e1b11b8e711))
* make queue next/prev peek instead of mutating index eagerly ([3b809ef](https://github.com/sergiocastrovale/instalib/commit/3b809efa74aff7424603159c380ea5110dc819cf))
* only bump last_played_at on position patches ([fff0652](https://github.com/sergiocastrovale/instalib/commit/fff06529cb66bc28c09716f95eb673ac3152ddaa))
* only delete inFlight entry if it still holds the same promise ([f37fe42](https://github.com/sergiocastrovale/instalib/commit/f37fe42235ad4ce85883d9a676b74ceac13d8980))
* recover rows stuck in downloading status on startup ([bf7c356](https://github.com/sergiocastrovale/instalib/commit/bf7c356845e41461166d488559b6ecefa6f8de10))
* restrict shellOpenExternal to http/https schemes ([07fa6b2](https://github.com/sergiocastrovale/instalib/commit/07fa6b22187ba99198f52c10556c9a4bb5a3b2d5))
* stop progress timer on video ended, not just pause ([fad162f](https://github.com/sergiocastrovale/instalib/commit/fad162fb6f6ef2f06a7b8051b5e354c0c95cefa9))
* thread collectionId through syncStart to scope sync to a collection ([cef4fe8](https://github.com/sergiocastrovale/instalib/commit/cef4fe8bc1f63a5afed41438874840da97008c79))
* validate media protocol kind and clamp/reject bad range headers ([a6e59da](https://github.com/sergiocastrovale/instalib/commit/a6e59da21462ffe374f751cc29e20acc0e5b127c))
* wrap collection list and filters at small widths ([fdce76a](https://github.com/sergiocastrovale/instalib/commit/fdce76a7f9dc2f7d56f4ca4457c66e26d295b195))

### Performance

* collapse upsertVideo to a single INSERT ON CONFLICT RETURNING ([aa69c04](https://github.com/sergiocastrovale/instalib/commit/aa69c043ffc3d5e1e395789b584e6460cca97971))

### Refactoring

* delegate WatchPage video actions to usePlayer ([9420722](https://github.com/sergiocastrovale/instalib/commit/9420722080967a22875dad0b7536878dde714395))
* extract QueueList/QueueItem from WatchPage up-next sidebar ([02c731b](https://github.com/sergiocastrovale/instalib/commit/02c731bef609deff78b89ca9ba0df2285f583bcb))
* extract shared ConfirmDialog component ([18679e4](https://github.com/sergiocastrovale/instalib/commit/18679e44a35f4a2d66fc0ebf9405794c05ff0ec2))
* extract shared listQuery helper ([d4c7854](https://github.com/sergiocastrovale/instalib/commit/d4c785432cd01599f007d76f9a7ba7254521005a))
* extract ShortcutsDialog sourced from usePlayerHotkeys data ([76ea678](https://github.com/sergiocastrovale/instalib/commit/76ea67811d2df830c92f44466d7d94946900f69d))
* extract TopBar component from App.vue header ([8cf6e74](https://github.com/sergiocastrovale/instalib/commit/8cf6e744870d3882e72074edc3907a621033a441))
* extract useBreadcrumbs root-crumb helper ([e77e2b0](https://github.com/sergiocastrovale/instalib/commit/e77e2b0ed056ad49455fddc1c92508e711fcad84))
* extract usePlayerHotkeys composable from WatchPage ([f9acf72](https://github.com/sergiocastrovale/instalib/commit/f9acf72fa23c13763d03a4afe595141ccc4ecaaf))
* extract useSetupInstall composable from SetupPage ([f4b8bb1](https://github.com/sergiocastrovale/instalib/commit/f4b8bb1ee862c4a9961e61ae8785fa2ed6421247))
* extract useVideoFilters composable from CollectionPage ([3ff26ce](https://github.com/sergiocastrovale/instalib/commit/3ff26ce220585257e676f8bea396c7af62bd9524))
* move continueWatching/cover-picking into library store ([e5d539f](https://github.com/sergiocastrovale/instalib/commit/e5d539f68317e3b27811c30204553248583c446e))
* move playAll into useQueue, deleteCollection into library store ([3e36290](https://github.com/sergiocastrovale/instalib/commit/3e362909936177ab3dead9b65da2bc6e448d1528))
* move queue video loading into useQueue composable ([092310b](https://github.com/sergiocastrovale/instalib/commit/092310b9680069fb84d85acbe088ec623c2285ca))
* rename playlist to collection everywhere ([01e0933](https://github.com/sergiocastrovale/instalib/commit/01e0933c37560abb7ed94d22bb1d0363f0a03b42))
* split SettingsPage into SetupSettings/DataSettings tabs ([8c2d7ac](https://github.com/sergiocastrovale/instalib/commit/8c2d7acfd81cb295bd841ca6d64a49e2ec7f547e))

### Build

* drop installer targets, ship portable-only ([5da6b87](https://github.com/sergiocastrovale/instalib/commit/5da6b875abf54d2e13767dd6816c3d1f21a2b714))

### CI

* add multi-OS release build workflow ([fcd62fa](https://github.com/sergiocastrovale/instalib/commit/fcd62fa088bc53f759bcbf18e92bb4d87a846660))

### Documentation

* general tidying up ([b8801f5](https://github.com/sergiocastrovale/instalib/commit/b8801f5d21f7e8d6d54ae574a74083095e83f91a))
* reword video status labels to Downloaded/Web ([5b5f955](https://github.com/sergiocastrovale/instalib/commit/5b5f95593c557d30d3bcacc78b76dd8b978ee473))
