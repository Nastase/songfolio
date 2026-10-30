# Songfolio handoff

Checklist for building Songfolio, following `docs/Songfolio - Requirements & Plan.pdf` (the spec).
Same phases and order as the spec. Tick a box when the task is done and committed.

**Legend**

- `- [ ]` task from the spec · `- [ ] ➕` addition to the spec found while reviewing it
- **Decide:** a choice the spec leaves open; record the answer next to the task when made
- `(R7)` requirement ID from the spec

## How to work a phase

Applies to every phase; not repeated below.

1. Read the phase's section of the spec and this checklist, starting from the exit criteria.
2. One phase per session. Settle the phase's **Decide** tasks first.
3. Before calling a task done: `npm run typecheck && npm test && npm run lint`.
4. ➕ Check the result in the dev vault on desktop **and** on the Android tablet (synced vault),
   in reading view and live preview, light and dark theme.
5. ➕ Update or add dev-vault songs so each new feature is exercised by at least one song.
6. Conventional Commits, one logical change per commit (see CLAUDE.md).
7. Tick the boxes here in the same commit as the work.

## Roadmap and gates

| Stage    | Phases | Gate at the end      |
| -------- | ------ | -------------------- |
| Prove it | 0      | Spikes pass          |
| Core v1  | 1–5    | First binder pages   |
| Complete | 6–7    | v1 stable in use     |
| Publish  | 8      | Optional             |

---

## Phase 0: setup and spikes

**Exit:** alphaTab renders on both devices, and the PDF route is chosen.

### Setup

- [x] Repo created from Obsidian's sample plugin template (TypeScript, esbuild)
- [x] Dev vault with 5 public-domain songs in `dev-vault/Songs/`, each listing what it exercises
- [x] Hot reload (`npm run setup:vault`, `npm run dev` builds into the dev vault)
- [x] Vitest with fixtures in `test/fixtures/`
- [x] ESLint boundary: `src/parser` and `src/model` cannot import `obsidian`
- [x] `isDesktopOnly: false`, block name setting (`songsheet` by default)

### Spike S1: alphaTab on desktop and Android

Risks covered: alphaTab inside Obsidian (workers, music font loading, large bundle) and speed on
the Android tablet.

- [x] ➕ Work on a throwaway branch `spike/s1-alphatab`; spike code is not merged
- [x] Study how the Tab Flow plugin loads alphaTab: fonts, assets, workers (it downloads assets
      from GitHub, so not reusable; font inlined instead)
- [x] ➕ Check the licences of alphaTab and its music font for store publishing (spec: before
      Phase 4; done here because it can stop the plan)
- [x] Add `@coderline/alphatab` and render one `%tab` block on desktop (Wayfaring Stranger)
- [x] Disable the player and workers
- [x] Tab-only staff with rhythm (TabRhythmMode)
- [x] ➕ Bundle the music font and any assets inside the plugin's release files: the store
      installs only `main.js`, `manifest.json` and `styles.css`, and network calls are not allowed
- [x] Load alphaTab only when a song contains `%tab`
  - [x] ➕ Confirm how this works in a single CommonJS `main.js` (deferred initialisation vs a
        separate chunk) and measure plugin startup on a note without tab
- [x] ➕ Measure the size `main.js` gains from alphaTab
- [x] Confirm alphaTex's chord beat effect can show chord names above tab bars
- [x] ➕ Check tab colours in dark theme (follow the theme or can be set from CSS variables)
- [x] ➕ Set up syncing of `dev-vault/` to the Android tablet, including
      `.obsidian/plugins/songfolio` (the community plugins folder must be synced)
- [ ] ➕ Set up remote debugging of the tablet (Chrome `chrome://inspect`) to read console timing
      (skipped: not needed, the timing is shown in the block)
- [x] Render the `%tab` block on the Android tablet
- [x] Time a song with 4 tab blocks on the tablet; target under 1 second (median 28–63 ms)
  - [x] ➕ Define the measurement: from processor call to the last render-finished event, logged
        to the console, median of 5 note opens (shown in the block instead of the console)
- [x] Try rendering tabs only when scrolled into view, and measure the difference
- [x] ➕ Write findings and the go/no-go in `docs/spikes/s1-alphatab.md`

### Spike S2: native PDF export of a song with tab

Risks covered: Obsidian's "Export to PDF" capturing the page before tabs finish or at the wrong
width; page breaks splitting a tab or strum block.

- [ ] ➕ Work on a throwaway branch `spike/s2-pdf` (on top of the S1 branch)
- [ ] Export a test song with tab using Obsidian's native "Export to PDF"
- [ ] Check tabs are complete (not blank), at the right width, and not cut
- [ ] ➕ Check S1's render-when-visible does not leave off-screen tabs blank in the PDF
- [ ] Try print CSS that avoids page breaks inside blocks
- [ ] ➕ Check what native export allows: page size, margins, whether properties are printed
- [ ] If native export fails: prototype the plugin's own export (render into a hidden print
      container, wait for every block, then print), desktop only behind `Platform.isDesktop`
- [ ] ➕ Write findings and the chosen PDF route in `docs/spikes/s2-pdf.md`

### Phase 0 exit

- [x] alphaTab renders on desktop and on the Android tablet (S1: go)
- [ ] PDF route chosen
- [ ] **Gate: spikes pass**

---

## Phase 1: parser and lyrics

**Exit:** your existing Chord Sheets songs render the same after renaming `chords` to `songsheet`.

- [ ] **Decide:** Chord Sheets inline shapes. The spec says anything Chord Sheets accepts stays
      valid, and also that inline shapes are not supported. Ignore silently, keep as text, or show
      an error?
- [ ] **Decide:** behaviour for unknown `%` directives and for an unclosed `%tab` / `%ascii`
- [ ] Gather your existing Chord Sheets songs for the exit check
- [ ] ➕ Pin the Chord Sheets version (commit) being reused and record it
- [ ] ➕ Keep Chord Sheets' MIT notice with the reused code (file headers plus a third-party notices
      file)
- [ ] Song model in `src/model`: sections, chord lines, lyric lines, directives, errors with line
      numbers, metadata from properties
- [ ] Parser: `[Name]` on its own line starts a section
- [ ] ➕ Parser: lines before the first section header
- [ ] Parser: chord lines over lyric lines, auto-detected as in Chord Sheets
- [ ] Parser: `%c` forces a chord line, `%t` forces a lyric line
- [ ] Parser: collect `%pattern`, `%strum`, `%shape`, `%tab`…`%endtab`, `%ascii`…`%endascii` as
      structured nodes (rendered in later phases)
- [ ] Unit tests against fixtures, including `chord-sheets-legacy.songsheet`
- [ ] Chords-and-lyrics renderer adapted from Chord Sheets
- [ ] Chord and lyric alignment kept when lines wrap (R1)
- [ ] ➕ Check wrapping at phone width
- [ ] Section titles (R2)
- [ ] Header text from properties: title (file name when empty), artist, key, capo, tuning, tempo,
      difficulty (R3; sounding key comes in Phase 3)
- [ ] ➕ Re-render the header when the note's properties change (a code block processor does not
      re-run on frontmatter changes); clean up listeners when the block unloads
- [ ] Errors shown on the block, with line numbers
- [ ] Obsidian CSS variables so the block follows the theme
- [ ] Renders in reading view and live preview (R1)
- [ ] ➕ Check it works with the Chord Sheets plugin enabled at the same time
- [ ] Exit check: your Chord Sheets songs render the same after renaming the block

---

## Phase 2: strumming

**Exit:** your example song's two 8th-note patterns render correctly, plus a 16th test pattern
with accents and mutes.

- [ ] **Decide:** what happens when the `time` property is not 4/4 (v1 supports only 4/4)
- [ ] **Decide:** edge cases: duplicate pattern names, `%strum` not on the line after a section
      header, a pattern defined after it is used
- [ ] Gather your example song for the exit check
- [ ] Parse `%pattern <name> <grid>: <slots>`, grid `8` or `16`
- [ ] Slots in groups of 4; spaces ignored
- [ ] Slot symbols: `d` down, `u` up, `x` muted (direction from slot position), `.` no stroke,
      `D` `U` `X` accented
- [ ] Check slot count against grid and time signature (R7)
- [ ] `%strum <name>` after a section header applies the pattern until the next section
- [ ] Unknown pattern name shown as an error on the block (R7)
- [ ] Wrong slot count shown as an error on the block (R7)
- [ ] Parser unit tests for every rule above
- [ ] SVG renderer: beat counts (1 e & a), stroke arrows, accents, muted strokes, rests (R6)
- [ ] ➕ Beat counts for the 8th grid (1 & 2 &)
- [ ] ➕ SVG colours from the theme (current colour / CSS variables); readable at phone width
- [ ] Every named pattern drawn in the song header (R5)
- [ ] Pattern name beside each section title (R2)
- [ ] ➕ Swing Low, Sweet Chariot shows the deliberate slot-count error
- [ ] Exit check: your example's two 8th patterns plus the 16th test pattern (When the Saints)

---

## Phase 3: chord diagrams

**Exit:** every chord in 5 test songs shows a diagram or a clear placeholder.

- [ ] **Decide:** chord diagrams when `tuning` is not standard (e.g. drop D in Red River Valley)
- [ ] **Decide:** sharps or flats for the sounding key
- [ ] **Decide:** how `%shape` writes frets 10 and above (`133111` allows one character per
      string)
- [ ] Add chords-db (fingerings) and Vexchords (diagrams), as Chord Sheets does
- [ ] ➕ Record their licences in the third-party notices
- [ ] Collect every distinct chord in the song (R4)
- [ ] Diagram row in the header (R4)
- [ ] Parse `%shape <chord> <frets>`: low E to high E, `x` muted, `0` open
- [ ] ➕ Invalid `%shape` lines (wrong string count, bad characters) shown as errors
- [ ] Chords without `%shape` use the first fingering in the library
- [ ] `%shape` fingering used on screen and in the PDF
- [ ] Pick an alternative fingering from a diagram (R4)
  - [ ] Writes or updates the chord's `%shape` line at the top of the block
  - [ ] ➕ Works with touch on Android
  - [ ] ➕ Edits only the block it belongs to and leaves the rest of the note unchanged
- [ ] Clear placeholder for chords missing from the library
- [ ] Capo-aware sounding key in the header (R3)
- [ ] Exit check: all 5 dev-vault songs show a diagram or placeholder for every chord

---

## Phase 4: tablature

**Exit:** the solo from your example, rewritten in alphaTex, renders; the tablet speed target is
met.

- [x] alphaTab licence checked (spec: before Phase 4; see S1)
- [ ] Gather the solo from your example and rewrite it in alphaTex
- [ ] Move what worked in S1 into `src/render/tab` as production code
- [ ] alphaTab loaded only when a song contains `%tab`
- [ ] `%tab`…`%endtab` holds beats only; the plugin adds the tab-only staff (R8)
- [ ] Tab staff tuning from the `tuning` property (R8)
  - [ ] ➕ Map the property (low to high, no octaves) to alphaTex tuning (with octaves)
  - [ ] ➕ Invalid tuning shown as an error on the block
- [ ] Rhythm on the tab-only staff (R8)
- [ ] Chord names above tab bars with the chord beat effect, if S1 confirmed it
- [ ] ➕ alphaTex syntax errors shown on the block instead of a blank area
- [ ] Render tabs only when scrolled into view, if S1 showed it is needed
- [ ] ➕ Tab colours follow the theme
- [ ] `%ascii`…`%endascii` in a styled monospace box that scrolls instead of wrapping (R9)
- [ ] Exit check: the solo renders
- [ ] Exit check: a song with 4 tab blocks renders in under 1 second on the tablet

---

## Phase 5: PDF export, completing v1

**Exit:** 3 songs printed and filed in the binder look right.

- [ ] Implement the PDF route chosen in S2
- [ ] Print style: own light style, independent of the theme (R10)
- [ ] Header on page 1 (R10)
- [ ] No strum or tab block split across pages (R10)
- [ ] If S2 requires it: plugin's own export command, desktop only behind `Platform.isDesktop`
  - [ ] ➕ Command not offered on mobile
  - [ ] ➕ Waits for every block, including tabs not yet scrolled into view
- [ ] ➕ Multi-page song check (a long song across 2+ pages)
- [ ] Exit check: 3 songs printed and filed look right
- [ ] ➕ Tag a v1 release with the existing release workflow
- [ ] **Gate: first binder pages**

---

## Phase 6: library and importer

**Exit:** 5 pasted songs import needing only small fixes.

- [ ] **Decide:** which folder the template command creates new song notes in
- [ ] Command: create a song template note with all properties pre-filled (R12)
- [ ] Command: create a starter `Songs.base` with views "Learning now", "By artist", "Learned"
      (R12)
- [ ] ➕ Starter base command does not overwrite an existing `Songs.base`
- [ ] ➕ Check the properties have the right types in Obsidian (number, date, tags)
- [ ] Gather 10 or more real pasted Ultimate Guitar songs as importer fixtures
- [ ] ➕ Keep 5 more pastes aside, not used while building, for the exit check
- [ ] Command "Import song from clipboard": Ultimate Guitar text → new song note with properties
      and a `songsheet` block (R11)
- [ ] Importer fills the properties it finds: tuning, capo, key
- [ ] Pasted ASCII tab becomes an `%ascii` block
- [ ] Importer tests against the fixtures
- [ ] ➕ Check reading the clipboard on Android
- [ ] Exit check: 5 pasted songs import needing only small fixes

---

## Phase 7: transpose and editor polish

**Exit (➕ the spec has none):** the gate "v1 stable in use": these features used on your own
songs without blocking issues.

- [ ] **Decide:** does transpose also update the `key` property and the `%shape` lines?
- [ ] **Decide:** how to do source-mode highlighting (R14) given the rule "no CodeMirror editor
      extension"; drop R14 if it needs one
- [ ] **Decide:** the property for per-song autoscroll speed (not in the property table) (R17)
- [ ] **Decide:** which phase gets R16 (ASCII → `%tab`); the spec places it in none
- [ ] Commands: transpose chords up and down in the block source (R13)
- [ ] Command: toggle sharps or flats (R13)
- [ ] Tab is never transposed (R13)
- [ ] ➕ Chords stay aligned over lyrics when chord names change length
- [ ] Syntax highlighting of chords and `%` directives in source mode, only if typing stays fast
      (R14, Could)
- [ ] Autocomplete for directives and pattern names (R15, Could)
- [ ] Autoscroll at a speed set per song (R17, Could)
- [ ] ➕ Best-effort `%ascii` → `%tab` conversion, you fill in the rhythm (R16, Could), if placed
      here
- [ ] **Gate: v1 stable in use**

---

## Phase 8: publish (optional)

**Exit (➕ the spec has none):** submission to the community store opened.

- [ ] README with a syntax reference
- [ ] Licence notices: Chord Sheets (MIT) and every bundled library and font
- [ ] GitHub release workflow
  - [ ] ➕ It exists from the template: check it attaches `main.js`, `manifest.json`, `styles.css`
- [ ] Recheck the community store for a "Songfolio" name clash
- [ ] ➕ Review against the store guidelines in `AGENTS.md` (sentence case, command IDs, no network
      calls)
- [ ] ➕ Revisit the `prefer-setting-definitions` lint warning when raising `minAppVersion` (needs
      Obsidian 1.13; manifest targets 1.9.0)
- [ ] Community store submission

---

## Requirement coverage

| ID  | Requirement                                   | Priority | Phase |
| --- | --------------------------------------------- | -------- | ----- |
| R1  | Render in reading view and live preview       | Must     | 1     |
| R2  | Section titles with pattern name              | Must     | 1, 2  |
| R3  | Header metadata, sounding key                 | Must     | 1, 3  |
| R4  | Chord diagrams, pick a fingering              | Must     | 3     |
| R5  | Every named pattern in the header             | Must     | 2     |
| R6  | Strum SVG                                     | Must     | 2     |
| R7  | Errors for slot count and unknown pattern     | Must     | 2     |
| R8  | `%tab` as tab-only staff with rhythm          | Must     | 4     |
| R9  | `%ascii` styled monospace                     | Must     | 4     |
| R10 | PDF export on desktop                         | Must     | 5     |
| R11 | Import from clipboard                         | Should   | 6     |
| R12 | Template and starter base commands            | Should   | 6     |
| R13 | Transpose                                     | Should   | 7     |
| R14 | Source-mode highlighting                      | Could    | 7     |
| R15 | Autocomplete                                  | Could    | 7     |
| R16 | ASCII → `%tab` conversion                     | Could    | ➕ unplaced (decide in 7) |
| R17 | Autoscroll                                    | Could    | 7     |

Non-functional requirements and where they are checked:

- Runs on Android, no Node/Electron APIs outside desktop-only PDF code: every phase (step 4 of
  "How to work a phase"), S1, Phase 5
- 4 tab blocks under 1 second on the tablet: S1, Phase 4 exit
- Follows the theme on screen, own light style in print: Phases 1–4, Phase 5
- Store guidelines from day one: every phase, Phase 8 review
