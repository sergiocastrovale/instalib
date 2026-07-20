# Instalib — Practice Sections Feature — Engineering Handoff

**Repo:** `sergiocastrovale/instalib` (branch `main`) — Electron + Vue 3 + Tailwind v4 + reka-ui + Pinia + vue-router.
**Feature:** Replace the player's single A/B loop with **named practice sections** — up to **8 per video**, each with a name + notes, listed in a right-rail panel, seekable, editable, deletable, and shown as hoverable bands on the timeline.

This is scoped to the **renderer + one new persisted field**. It touches the player composable, the player dock, the watch page, adds a sections panel + edit dialog, and adds **one new persisted per-video field** (sections). It must NOT change queue/autoplay/keyboard-shortcut behavior. The design mockup (`Instalib.dc.html`) is the visual + interaction source of truth — match it.

---

## 0. Concept & behavior (what we're building)

Today the player has **A** and **B** buttons that mark one loop region (`loopA`/`loopB` on the player state) with two yellow markers on the timeline and a translucent band between them. **Remove that entirely** and replace with sections:

- A **section** = `{ id, start, end, name, notes }` where `start`/`end` are seconds into the video. Up to **8** per video.
- Creating one is a two-step mark: click **Start** (captures current time as a pending start), then **End** (captures current time; the section spans `[min,max]` of the two). No pending start → End does nothing.
- Sections are **per-video** and **persisted** (survive app restart and re-opening the video), stored alongside the video's other per-video data (position, notes, favorite, watched).
- One section can be **active** (looping): playback loops within `[start, end]` until the user stops it. Selecting a section from the panel seeks to its start, plays, and makes it active.
- Each section renders as a **colored band** on the scrubber; hovering a band shows a small popover with the section's name.
- The right rail gets a **Sections** panel below "Up next": list of sections (color dot, name, time range), each with **edit** (opens a dialog for name + notes) and **delete** (bin) buttons; clicking the row plays/loops the section.

### Data model per section
```ts
// add to src/shared/types.ts
export interface VideoSection {
  id: string;        // stable, e.g. crypto.randomUUID()
  start: number;     // seconds, >= 0
  end: number;       // seconds, > start
  name: string;      // default "Section {n}"
  notes: string;     // free text, default ""
}
```
Attach to whatever type represents a saved video (the one that already carries `position`, `favorite`, `watched`, `notes`). Add `sections: VideoSection[]` (default `[]`).

### Persistence (follow the existing per-video pattern)
The app already persists per-video `position`, `notes`, `favorite`, `watched` through `window.api.*` IPC into the SQLite DB. **Mirror that exact pattern** — do not invent a new mechanism:
- Add a `sections` column (JSON text) to the videos table (or a `video_sections` child table if you prefer normalized rows; JSON on the video row is simpler and matches how a small bounded array is used here).
- Add IPC: `videoSetSections(videoId, sections)` (channel in `ipc-channels.ts`, handler in main, method on the preload `window.api`), following the shape of the existing `notesSet` / `videoSetFavorite` handlers. Read them back as part of the existing "get video" fetch so no extra round-trip on open.
- The renderer writes sections through this IPC whenever the list changes (create, edit, delete). Debounce is unnecessary — these are discrete user actions, not keystroke streams (unlike notes).

> Guardrail: everything in `src/main`, `src/preload`, and the IPC contract is otherwise fixed. The only additions are the one new `sections` field + its getter/setter, done in the same style as the neighbors.

---

## 1. Player state & loop logic — `src/renderer/src/composables/usePlayer.ts`

This composable owns playback (`playing`, `currentTime`, `duration`, `speed`) and today owns `loopA`/`loopB` + the loop-wrap logic in its time-update path.

**Remove:** `loopA`, `loopB`, `setLoopA`, `setLoopB`, `clearLoop`, and the `if (loopA != null && loopB != null && t >= loopB) t = loopA` wrap.

**Add:**
```ts
const pendingStart = ref<number | null>(null);   // set by "Start", cleared on End/reset
const activeSectionId = ref<string | null>(null); // the section currently looping, if any

function startSection() { pendingStart.value = currentTime.value; }

// returns the new section (or null) so the caller can persist + select it
function endSection(existing: VideoSection[]): VideoSection | null {
  if (pendingStart.value == null || existing.length >= 8) { pendingStart.value = null; return null; }
  const start = Math.min(pendingStart.value, currentTime.value);
  const end   = Math.max(pendingStart.value, currentTime.value);
  pendingStart.value = null;
  if (end - start < 0.5) return null;               // ignore accidental zero-length
  return { id: crypto.randomUUID(), start, end, name: `Section ${existing.length + 1}`, notes: '' };
}

function playSection(sec: VideoSection) {
  activeSectionId.value = sec.id;
  seek(sec.start);           // your existing seek()
  play();                    // your existing play()
}
function stopLooping() { activeSectionId.value = null; }
```

**Loop enforcement** — in the same place the old A/B wrap lived (the `timeupdate`/tick handler), loop within the active section:
```ts
if (activeSectionId.value != null) {
  const sec = sections.value.find(s => s.id === activeSectionId.value);
  if (sec && currentTime.value >= sec.end) seek(sec.start);
}
```
`sections` here is the current video's section list — pass it into the composable or read it from the same store/prop the composable already uses for the current video. Keep it reactive so edits (a moved `end`) take effect immediately.

**On video change** (the existing "load new video" path that resets `currentTime`, `speed`, etc.): also reset `pendingStart = null` and `activeSectionId = null`. Sections themselves are loaded fresh from the new video's persisted data — they are NOT cleared.

---

## 2. Player controls — `src/renderer/src/components/player/PlayerDock.vue`

### 2a. Timeline / scrubber
The scrubber currently renders: track background, the A/B loop band, played fill, drag thumb, and (old) two yellow A/B markers. Replace the loop band + A/B markers with **section bands**, keeping the track, played fill, and thumb.

For each section, absolutely positioned inside the scrubber track:
- **Band:** `left = start/duration`, `width = (end-start)/duration`, full track height, `background: rgba(color, .30)`, `border-radius: 2px`, `z-index: 1`, `cursor: pointer`.
- **Edge markers:** a 2px solid line in the section color at the band's left and right edges (its `start` and `end`).
- **Colors:** cycle a fixed 8-color palette by section index so each section is visually distinct and matches its panel dot:
  ```
  ['#5b8def','#e5674f','#4ade80','#facc15','#c084fc','#38bdf8','#fb923c','#f472b6']
  ```
- **Pending-start marker:** while `pendingStart != null`, draw a 2px accent (`--primary`) vertical line at `pendingStart/duration`, slightly taller than the track, `z-index: 2`.
- **Stacking / clicks:** give the played fill, thumb, and pending marker `pointer-events: none` so the bands receive hover; the thumb sits at `z-index: 3` above bands. Clicking a band = `playSection(sec)` and must **stopPropagation** so it doesn't also fire the scrubber's seek handler. Seeking on empty track still works normally.

### 2b. Hover popover (timeline)
Show the section name on hover over its band.
- Track hover with `@mouseenter="hoveredId = sec.id"` / `@mouseleave="hoveredId = null"` on each band (component-local ref — do **not** put this in `usePlayer` or persist it).
- Render a single popover positioned above the track, centered on the hovered band: `left = (start + (end-start)/2)/duration`, `transform: translateX(-50%)`, sitting ~20px above the track (`bottom: 100%` region), `z-index: 5`, `pointer-events: none`.
- Style: dark chip (`background:#000; color:#fff`), 11px/500, `padding: 3px 8px`, `border-radius: 6px`, `white-space: nowrap`. It shows the section **name** only.
- (Optional niceties, not required: also flash the popover on the panel-row hover; a small caret under the chip.)

### 2c. Start / End buttons
Where the **A** and **B** buttons were (and delete the old "clear loop" button):
- **Start** — labeled button `[ Start` with a left-bracket icon, 30px tall, rounded-8, 12px/600. When `pendingStart != null` it's in the **armed** state: border + text `--primary`, background `--primary/15` (the mockup's `accs`). Click → `startSection()`.
- **End** — labeled button `End ]` with a right-bracket icon, same metrics. **Enabled only** when `pendingStart != null && currentTime > pendingStart && sections.length < 8`; otherwise render at `opacity: .55`, `cursor: default`, muted text, and no-op. Click → call `endSection(sections)`, and if it returns a section: append it to the video's sections, persist via `videoSetSections`, and set it active (`activeSectionId = sec.id`).

Everything else in the control row (prev/play/next, time label, speed pill, favorite, audio-only, fullscreen) stays exactly as-is.

---

## 3. Sections panel — new, in the watch right rail (`WatchPage.vue`)

The right rail today holds the **Up next** queue. Add a **Sections** block directly below it (same column, `margin-top: ~24px` — it must be inside the up-next column, not a new grid column). Consider a small `SectionsPanel.vue` component fed `sections`, `activeSectionId`, and emitting `play/edit/delete/stop-looping`.

Structure:
- **Header:** `Sections` (14px/600) + count badge `{n}/8` in mono muted.
- **Active banner** (only when a section is looping): a full-width chip, `background: --primary/15`, `color: --primary`, showing a loop icon + `Looping {activeName}` + an **×** button that calls `stopLooping()`.
- **List** (one row per section, `gap: 3px`):
  - Row: `display:flex; align-items:center; gap:10px; padding:8px 9px; border-radius:9px; cursor:pointer`. Active row background = `--primary/15`.
  - **Color dot** (9px rounded square) in the section's palette color (same index as its band).
  - **Text block:** name (12.5px/500, truncate) over time range `m:ss – m:ss` (mono, 10.5px, muted).
  - **Edit button** (pencil, 26px ghost icon) → open the edit dialog for this section. `@click.stop`.
  - **Delete button** (bin, 26px ghost icon) → remove the section, persist, and clear active/editing state if it referenced this id. `@click.stop`.
  - Row click (outside the buttons) → `playSection(sec)`.
- **Empty state** (no sections): muted helper text — "Use **Start** then **End** in the player to mark a loopable section. Up to 8."

All row/dot styling and the palette must match the timeline bands so a section reads as the same object in both places.

---

## 4. Edit dialog

Opened by a row's edit (pencil) button. Use the app's existing dialog primitive (reka-ui `Dialog`, consistent with other modals in the app) rather than a hand-rolled overlay — but match the mockup's layout:
- Title **Edit section**.
- **Name** — single-line text input (label above), seeded with the section's current name.
- **Notes** — multiline textarea (~4 rows, vertical resize), seeded with current notes, placeholder "What to practice in this section…".
- Footer: **Cancel** (outline) and **Save** (solid `--primary`).
- Edit against **local draft refs** (`editName`, `editNotes`); commit to the section only on **Save** (name falls back to the old name if blank, notes saved verbatim), then persist via `videoSetSections`. **Cancel** discards the draft. Closing via overlay/escape = cancel.

Fields use the elevated surface (`--secondary`/`--muted`) so they read as inputs on the card, and the textarea focus ring uses `--ring` (now the accent blue).

---

## 5. Interaction rules & edge cases

- **Max 8:** Start is always allowed; **End is blocked at 8** (and shows disabled). Optionally disable Start too at 8 for clarity.
- **Zero/negative length:** if End time ≤ Start time or the span `< 0.5s`, discard and just clear `pendingStart`.
- **Order:** store sections in creation order (matches band color assignment). Sorting by `start` is a fine optional enhancement but keep color-by-index stable if you do — assign color from a stable key, not post-sort index, or the band/dot colors will shuffle.
- **Active section deleted / video changed:** clear `activeSectionId`; playback continues normally (no loop).
- **Seeking outside an active section** while it's looping: the loop check only wraps at `end`, so a manual seek elsewhere keeps playing until it next crosses `end` — acceptable. If you want stricter behavior, clear `activeSectionId` on manual scrubber seek. (Mockup does not; keep parity unless asked.)
- **Autoplay / next video:** advancing tracks resets pending + active (see §1). Sections of the next video load from its persisted data.
- **Keyboard:** no new shortcuts required. If you want them, mirror existing shortcut registration — but that's out of scope for this pass.

---

## 6. Build order

1. `src/shared/types.ts`: add `VideoSection` + `sections` on the video type.
2. Persistence: DB column/migration + `videoSetSections` IPC (channel + main handler + preload method), and include `sections` in the existing get-video read. Follow the `notes`/`favorite` handlers verbatim.
3. `usePlayer.ts`: rip out A/B, add `pendingStart`, `activeSectionId`, `startSection`/`endSection`/`playSection`/`stopLooping`, and the active-section loop wrap; reset both on video change.
4. `PlayerDock.vue`: scrubber section bands + edge markers + pending marker + hover popover; swap A/B/clear buttons for Start/End.
5. `SectionsPanel.vue` + wire into `WatchPage.vue` right rail below Up next.
6. Edit dialog (reka-ui Dialog) with name/notes draft + Save/Cancel → persist.
7. `npm run typecheck && npm run dev`; verify: create → loop → hover popover → edit → delete → restart app (sections persisted) → switch video (its own sections load). Confirm queue/autoplay/speed/favorite/watched all still behave.

## 7. Guardrails

- Renderer-only except the single new persisted `sections` field and its getter/setter, added in the existing IPC/DB style.
- Do not touch queue/autoplay logic, keyboard shortcuts, or the rest of the `window.api` contract.
- `hoveredId`, `pendingStart` draft, and dialog draft state are **transient UI state** — never persist them.
- Reuse the app's `Dialog`, `Button`, input, and icon conventions; match the design tokens (accent blue, mono for all numerics/time ranges). Match the mockup `Instalib.dc.html` for exact sizes, colors, and layout.
