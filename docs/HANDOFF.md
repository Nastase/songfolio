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

- [x] ➕ Work on a throwaway branch `spike/s2-pdf` (on top of the S1 branch)
- [x] Export a test song with tab using Obsidian's native "Export to PDF"
- [x] Check tabs are complete (not blank), at the right width, and not cut (as-is: blank and cut;
      fixed by returning a promise from the handler and a fixed print width)
- [x] ➕ Check S1's render-when-visible does not leave off-screen tabs blank in the PDF (it does:
      bypass it while printing)
- [x] Try print CSS that avoids page breaks inside blocks (alphaTab rows put back in normal flow)
- [x] ➕ Check what native export allows: page size, margins, whether properties are printed
      (properties are never printed)
- [x] If native export fails: prototype the plugin's own export (not needed: native export
      works with plugin-side fixes)
- [x] ➕ Write findings and the chosen PDF route in `docs/spikes/s2-pdf.md`

### Phase 0 exit

- [x] alphaTab renders on desktop and on the Android tablet (S1: go)
- [x] PDF route chosen: Obsidian's native "Export to PDF" with print-aware rendering (S2)
- [x] **Gate: spikes pass** (S1 go, S2 native export)

---

## Phase 1: parser and lyrics

**Exit:** your existing Chord Sheets songs render the same after renaming `chords` to `songsheet`.

- [x] **Decide:** Chord Sheets inline shapes. The spec says anything Chord Sheets accepts stays
      valid, and also that inline shapes are not supported. Ignore silently, keep as text, or show
      an error? (Show the chord name and drop the shape silently: `C[x32010]` renders as `C`.)
- [x] **Decide:** behaviour for unknown `%` directives and for an unclosed `%tab` / `%ascii`
      (Both are errors on the block with the line number; the rest still renders. An unknown
      directive line is hidden; an unclosed block runs to the end of the song.)
- [x] ➕ **Decide:** `[Name] text` (e.g. `[Intro] (Piano Riff)`, used in real songs): a section
      titled Name with the text as a muted note, when Name is not a chord. Chord Sheets would
      read the line as a chord line.
- [x] ➕ **Decide:** raw ASCII tab lines without `%ascii` (`e|--3--|`, used in real songs):
      consecutive lines become one monospace box that scrolls instead of wrapping.
- [x] ➕ **Decide:** lyrics font: a "Lyrics font" setting, monospace by default (as Chord Sheets),
      or the theme text font. Error line numbers count from the first line inside the block.
- [x] Gather your existing Chord Sheets songs for the exit check (7 songs from the personal vault,
      copied into `dev-vault/Private/`, which is gitignored: the lyrics are copyrighted; committed
      fixtures only copy their syntax)
- [x] ➕ Pin the Chord Sheets version (commit) being reused and record it (tag `1.11.0`, commit
      `e563134dece0e4d09d1b647f07b620022427d980`)
- [x] ➕ Keep Chord Sheets' MIT notice with the reused code (file headers plus a third-party notices
      file)
- [x] Song model in `src/model`: sections, chord lines, lyric lines, directives, errors with line
      numbers, metadata from properties
- [x] Parser: `[Name]` on its own line starts a section
- [x] ➕ Parser: lines before the first section header
- [x] Parser: chord lines over lyric lines, auto-detected as in Chord Sheets
- [x] Parser: `%c` forces a chord line, `%t` forces a lyric line
- [x] Parser: collect `%pattern`, `%strum`, `%shape`, `%tab`…`%endtab`, `%ascii`…`%endascii` as
      structured nodes (rendered in later phases)
- [x] Unit tests against fixtures, including `chord-sheets-legacy.songsheet`
- [x] Chords-and-lyrics renderer adapted from Chord Sheets
- [x] Chord and lyric alignment kept when lines wrap (R1)
- [x] ➕ Check wrapping at phone width (desktop, note narrowed to 340 px; recheck on the phone)
- [x] Section titles (R2)
- [x] Header text from properties: title (file name when empty), artist, key, capo, tuning, tempo,
      difficulty (R3; sounding key comes in Phase 3)
- [x] ➕ Re-render the header when the note's properties change (a code block processor does not
      re-run on frontmatter changes); clean up listeners when the block unloads
- [x] Errors shown on the block, with line numbers
- [x] Obsidian CSS variables so the block follows the theme
- [x] Renders in reading view and live preview (R1)
- [x] ➕ Check it works with the Chord Sheets plugin enabled at the same time
- [x] Exit check: your Chord Sheets songs render the same after renaming the block

---

## Phase 2: strumming

**Exit:** your example song's two 8th-note patterns render correctly, plus a 16th test pattern
with accents and mutes.

- [x] **Decide:** what happens when the `time` property is not 4/4 (v1 supports only 4/4)
      (Any n/4 is supported: 2/4, 3/4, 5/4… Other values such as 6/8 give one error on the
      block, only when the song has patterns; the patterns are still drawn but their slot counts
      are not checked. No `time` means 4/4.)
- [x] **Decide:** edge cases: duplicate pattern names, `%strum` not on the line after a section
      header, a pattern defined after it is used (A duplicate name is an error on the later
      line and the first definition is kept. `%strum` may go anywhere: before the section's
      first line it shows beside the title, further down it switches the pattern at that point;
      before any header it labels the untitled opening part. A pattern may be defined after its
      use.)
- [x] ➕ **Decide:** patterns longer than a bar (a real song uses a 2-bar pattern): any whole
      number of bars is valid; counts restart each bar and each bar wraps on its own
- [x] ➕ **Decide:** pattern names: may contain spaces, cannot contain `+`, matched in any case
- [x] ➕ **Decide:** extra slot symbols: `-` means the same as `.`; `|` is an optional bar line,
      ignored like a space, an error when it is not on a bar boundary
- [x] ➕ **Decide:** pattern drawing in sections: a tag with the name by default;
      `%strum <name> +draw` also draws a compact pattern (a word starting with `+` is an option;
      unknown options are errors)
- [x] Gather your example song for the exit check (Oh! Susanna in the dev vault stands in: two
      8th patterns)
- [x] Parse `%pattern <name> <grid>: <slots>`, grid `8` or `16`
- [x] Slots in groups of 4; spaces ignored
- [x] Slot symbols: `d` down, `u` up, `x` muted (direction from slot position), `.` no stroke,
      `D` `U` `X` accented
- [x] ➕ Pattern names with spaces, any case; `-` and `|` in slots
- [x] Check slot count against grid and time signature (R7)
  - [x] ➕ Read the `time` property; any n/4, a whole number of bars
  - [x] ➕ Errors from properties shown without a line number
- [x] `%strum <name>` after a section header applies the pattern until the next section
  - [x] ➕ A later `%strum` in a section switches the pattern at that point
  - [x] ➕ A `%strum` before the first header keeps the untitled opening part
  - [x] ➕ `+draw` option
- [x] Unknown pattern name shown as an error on the block (R7)
- [x] Wrong slot count shown as an error on the block (R7)
- [x] Parser unit tests for every rule above
- [x] SVG renderer: beat counts (1 e & a), stroke arrows, accents, muted strokes, rests (R6)
- [x] ➕ Beat counts for the 8th grid (1 & 2 &)
- [x] ➕ SVG colours from the theme (current colour / CSS variables); readable at phone width
- [x] ➕ An `aria-label` describing each pattern
- [x] Every named pattern drawn in the song header (R5)
- [x] Pattern name beside each section title (R2)
- [x] ➕ Re-render the whole block when its properties change (`time` changes the errors)
- [x] ➕ Swing Low, Sweet Chariot shows the deliberate slot-count error
- [x] ➕ Dev-vault songs for the extras (2-bar pattern, switch, `+draw`, 3/4, 6/8, errors)
- [x] Exit check: your example's two 8th patterns plus the 16th test pattern (When the Saints)
      (checked on desktop and on the Android tablet)

---

## Phase 3: chord diagrams

**Exit:** every chord in 5 test songs shows a diagram or a clear placeholder.

### Decisions

- [x] **Decide:** chord diagrams when `tuning` is not standard (e.g. drop D in Red River Valley)
      (A tuning that moves every string by the same amount, such as Eb or D standard, uses the
      library shapes unchanged. Other tunings move each library shape string by string: drop D
      adds 2 frets on the low string. Moved shapes lose their finger numbers; shapes that become
      unplayable (a fret below 0, or a span over 4 frets) are skipped, and a chord with none left
      shows the placeholder. `%shape` lines are always drawn as written.)
- [x] **Decide:** sharps or flats for the sounding key (fewest accidentals, as key signatures
      do: Db, Eb, F#, Ab, Bb major; C#m, D#m, F#m, G#m, Bbm minor. Ties go to sharps: F#, D#m.)
- [x] **Decide:** how `%shape` writes frets 10 and above (always one number per string,
      separated by spaces: `%shape C 8 10 10 9 8 8`; the picker writes this form. The compact form
      `%shape C x32010` is still read when it has exactly 6 characters, as in the spec example.)
- [x] ➕ **Decide:** diagram drawing (own SVG, like the strum renderer, instead of Vexchords. Chord
      Sheets 1.11 actually uses `@chordbook/charts`, a Vexchords fork; either adds about 96 KB of
      svg.js to a 54 KB `main.js` for a simple drawing.)
- [x] ➕ **Decide:** chord data (chords-db from Chord Sheets' fork `olvidalo/chords-db`, commit
      `1c2fa6ac3be52843b93a1f76de49b18c3044ec05`: the data Chord Sheets ships, with guitar data
      corrections and types. Only `lib/guitar.json` is bundled.)
- [x] ➕ **Decide:** picking a fingering (tap a header diagram: a dialog shows every fingering of
      that chord, the current one marked; tapping one saves it. Picking the library's first
      fingering removes the chord's `%shape` line.)
- [x] ➕ **Decide:** sounding key (written key + capo + a tuning that moves every string by the
      same amount; drop D does not move it. Shown only when it differs from `key`. A `key` that
      cannot be read is shown as written, without a sounding key.)
- [x] ➕ **Decide:** `%shape` rules (may go anywhere in the block, like `%pattern`; matched to
      chords by the exact symbol, case-sensitive; a repeated chord is an error on the later line
      and the first is kept; a shape for a chord not in the song is ignored; 6 strings, frets
      0–24, `x` muted. Chord Sheets inline shapes stay dropped, as decided in Phase 1.)

### Check first

- [x] ➕ With a throwaway button inside a rendered block, on desktop and the tablet, in live
      preview: does a tap switch the block to source? Do `ctx.getSectionInfo` and a write through
      the editor work, and does Ctrl+Z undo the write? (Branch `spike/s3-picker`, not merged.
      A tap or click stays in the rendered block, in live preview, reading view and an embed.
      `getSectionInfo` gives the block's lines in all three; in an embed, the embedded note's.
      Writing through the editor is undoable in live preview but does nothing useful in reading
      view: the hidden editor changes, the file is not saved. `vault.process` works everywhere,
      without undo. So: editor when the note is open in live preview or source mode, otherwise
      `vault.process`.)

### Data and parsing

- [x] Add chords-db (fingerings), from the fork above, guitar data only (the lockfile says
      `git+ssh`, but `npm ci` fetches public GitHub repos over https: checked with SSH blocked)
- [x] ➕ Record the chords-db licence in the third-party notices
- [x] ➕ Measure what `main.js` gains (+333 KB minified, about 4 ms to compile on desktop).
      Dropping `midi` would save 43 KB and loading the data lazily would need a custom loader:
      neither is worth it next to alphaTab's 1.67 MB
- [x] Parse `%shape <chord> <frets>`: low E to high E, `x` muted, `0` open
  - [x] ➕ Separated form for any fret; compact form read when it has 6 characters
- [x] ➕ Invalid `%shape` lines (wrong string count, bad characters, fret over 24, repeated
      chord) shown as errors; the chord falls back to the library
- [x] ➕ Parse the `tuning` property (moved from Phase 4): `EADGBE`, `E A D G B E`,
      `Eb Ab Db Gb Bb Eb`; 6 notes, low to high; offset of each string from standard (nearest,
      ties down). An invalid tuning is a property error and diagrams use standard tuning
      (also read: `eadgbe`, octaves such as `E2`, and names such as Standard, Drop D, Half step
      down, Open G)
- [x] Collect every distinct chord in the song (R4): chord lines and inline chords, by symbol,
      in order of first appearance; rhythm marks and `N.C.` left out
- [x] Capo-aware sounding key in the header (R3), plus the tuning shift (see Decisions)

### Diagrams

- [x] Chords without `%shape` use the first fingering in the library
  - [x] ➕ Lookup ported from Chord Sheets (`findDbChord`: tonic spellings, slash chords,
        aliases), keeping its licence notice
  - [x] ➕ Library shapes moved string by string for a non-standard tuning
- [x] `%shape` fingering used on screen and in the PDF
  - [x] ➕ When the frets match a library fingering, draw its finger numbers and barre;
        otherwise draw a barre where the lowest fret is held across strings
- [x] ➕ SVG diagram: strings, frets, nut or base-fret label, dots, barres, `x` and `o`, finger
      numbers; colours from CSS (theme and print); an `aria-label`; pure layout unit-tested
- [x] Clear placeholder for chords missing from the library (says to add `%shape`)
- [x] Diagram row in the header (R4), between the facts and the patterns; wraps at phone width

### Picking a fingering

- [x] Pick an alternative fingering from a diagram (R4)
  - [x] Writes or updates the chord's `%shape` line at the top of the block (a pure edit
        function in `src/parser`: replace the chord's line, or insert it after the `%pattern`
        and `%shape` lines that open the block; remove it on the default pick; repeats of the
        chord's line are removed too)
  - [x] ➕ Works with touch on Android
  - [x] ➕ Edits only the block it belongs to and leaves the rest of the note unchanged
        (`ctx.getSectionInfo`; write only if the block text still matches what was parsed)
  - [x] ➕ Ctrl+Z undoes a pick in live preview (write through the editor when the note is open
        in live preview or source mode; `vault.process` otherwise, e.g. reading view or an embed)
  - [x] ➕ Diagrams are read-only where `getSectionInfo` returns null (embeds work; a tap
        there shows a notice)
- [x] ➕ The chooser's tap affordances are hidden in print

### Dev vault and exit

- [x] ➕ A dev-vault song for diagrams: separated frets, a custom shape, a chord missing from the
      library, slash chords, Eb tuning (sounding key); `%shape` errors in "Syntax errors"
- [x] ➕ One native PDF export of a song with `%shape` (the print style itself is Phase 5)
      ("Chord diagrams": diagrams print in the light style with their `%shape` fingerings)
- [x] ➕ Exit extra: library coverage on the 7 private songs; list the chords that get a
      placeholder (81 chords across the dev-vault and private songs; only `Dmadd11` in Walk has
      none. Read from the source: the private songs still use Chord Sheets' `chords` block)
- [x] ➕ Exit extra: pick a fingering on desktop and on the tablet, reading view and live preview
- [x] Exit check: all 5 dev-vault songs show a diagram or placeholder for every chord (every
      dev-vault song has a diagram for every chord; the only placeholder is the deliberate C/D#
      in "Chord diagrams"; checked on desktop and on the Android tablet)

---

## Phase 4: tablature

**Exit:** the solo from your example, rewritten in alphaTex, renders; the tablet speed target is
met. (The private songs have no solo: the Walk intro riff stands in.)

**Status:** built and checked on desktop (reading view, live preview, light and dark theme, PDF
export). Two exit checks stay open and carry over to Phase 5: the tablet speed check, and
confirming the Walk rhythm by ear (and on the tablet). Not rechecked this phase: wrapping at
phone width (340 px).

### Decisions

- [x] ➕ **Decide:** which riff is the exit check (the Walk intro, rewritten in alphaTex in the
      private Songfolio copy only: copyrighted, never committed)
- [x] **Decide:** do chords named only in `%tab` also get header diagrams? (Yes: `{ch "Am"}`
      names join the diagram row after the chord-line chords, in order of first appearance, and
      `%shape` applies to them too.)
- [x] ➕ **Decide:** what the plugin adds around the beats, and what a `%tab` may not contain
      (The plugin adds the track, the tab staff, the tuning and the time signature. Score, track
      and staff metadata in a `%tab` (`\title`, `\track`, `\staff`, `\tuning`…) are an error on
      that line; the line is ignored and the tab still renders. Bar metadata such as `\ts`,
      `\ks`, `\tempo`, `\section`, repeats, and `\chord`, stay allowed.)
- [x] ➕ **Decide:** time signature of a tab (the `time` property, any n/d including 6/8; an
      unreadable `time` means 4/4. Strumming keeps its own n/4 rule.)
- [x] ➕ **Decide:** alphaTab's "rendered by alphaTab" footer (hidden; alphaTab is credited in
      the README and the third-party notices)
- [x] ➕ **Decide:** where alphaTex errors show (in place of the tab, with block line numbers;
      an empty `%tab` draws nothing)
- [x] ➕ **Decide:** render tabs only when scrolled into view (yes, as S1 recommends: it also
      keeps alphaTab out of Obsidian's hidden copy of the other view)
- [x] ➕ **Decide:** the export handler returning a promise moves here from Phase 5 (the print
      mode cannot be checked without it); Phase 5 keeps the print style

### Tasks

- [x] alphaTab licence checked (spec: before Phase 4; see S1)
- [x] Gather the solo from your example and rewrite it in alphaTex (Walk intro: three bars of
      8ths grouped 3+3+2, read from the ASCII tab, added under it in the private Songfolio copy)
- [x] Move what worked in S1 into `src/render/tab` as production code
  - [x] ➕ alphaTab pinned at 1.8.4, Bravura inlined; both licences in the third-party notices
- [x] alphaTab loaded only when a song contains `%tab`
- [x] `%tab`…`%endtab` holds beats only; the plugin adds the tab-only staff (R8)
  - [x] ➕ Score, track and staff metadata inside `%tab` shown as errors and ignored
- [x] Tab staff tuning from the `tuning` property (R8)
  - [x] ➕ Map the property (low to high, no octaves) to alphaTex tuning (with octaves), from
        the Phase 3 string offsets
  - [x] ➕ Invalid tuning shown as an error on the block (done in Phase 3, which parses
        `tuning` for the chord diagrams)
- [x] ➕ Tab time signature from the `time` property
- [x] Rhythm on the tab-only staff (R8)
- [x] Chord names above tab bars with the chord beat effect, if S1 confirmed it
  - [x] ➕ Chords named only in `%tab` get header diagrams
- [x] ➕ Hide alphaTab's track name, tuning label, dynamics, tempo, chord diagrams and footer
- [x] ➕ alphaTex syntax errors shown on the block instead of a blank area
- [x] Render tabs only when scrolled into view, if S1 showed it is needed (space reserved
      from the bar count and width until drawn)
- [x] ➕ The block re-renders on every relevant property change (Phase 2); check that editing a
      property does not make tabs slow, and keep tabs when only `time` or the header changed
      (tabs are drawn again only when `tuning` or `time` changes)
- [x] ➕ Print mode for tabs (S2): when the block is inside `.print`, lazy loading and
      render-when-visible off, fixed width (654 px) and scale (0.8), and a promise that resolves
      on every tab's `postRenderFinished` or `error`
  - [x] ➕ The handler returns that promise only during export, with a 10 s timeout (moved
        from Phase 5)
- [x] ➕ Stop alphaTab adding a duplicate shared `<style>` per tab (see S2 findings; also
      removes alphaTab's styles when the plugin unloads)
- [x] ➕ Tab colours follow the theme, and change with it without reopening the note
- [x] `%ascii`…`%endascii` in a styled monospace box that scrolls instead of wrapping (R9)
  - [x] ➕ Drawn by `src/render/ascii`
- [x] ➕ A production build into the dev vault for the tablet (`npm run build:vault`: 2.0 MB
      instead of the dev build's 11 MB with inline source maps)
- [x] ➕ Dev-vault songs for tabs: 4 tab blocks, chord names, drop D, 3/4, errors (Greensleeves:
      four 6/8 tabs, E7 only in a tab; Amazing Grace: 3/4 melody; Red River Valley: drop-D intro;
      Syntax errors: `\title` and a bad note)
- [ ] Exit check: the solo renders (renders on desktop; rhythm to confirm by ear, and on the
      tablet)
- [ ] Exit check: a song with 4 tab blocks renders in under 1 second on the tablet
      (Greensleeves; `npm run build:vault`, then 5 opens. Desktop PDF export of 4 tabs: all
      drawn, under 1 s)

---

## Phase 5: PDF export, completing v1

**Exit:** 3 songs printed and filed in the binder look right.

### Decisions

- [x] ➕ **Decide:** print width of tabs (alphaTab draws fixed-width SVG, so the width is chosen
      before drawing). The export dialog saves its options (`pdfExportSettings`: page size,
      landscape, margins, downscale) with `vault.setConfig` before the note is rendered for
      export (read from Obsidian 1.14.5 and 1.15.0), so the plugin reads them and computes the
      text column, instead of S2's fixed 654 px, which cuts tabs on A5 or when downscaled. The
      API is undocumented: missing or unexpected values fall back to A4 with default margins.
- [x] ➕ **Decide:** print colours (colour printing: chords and accents in one fixed dark blue,
      the rest black and greys; nothing taken from the theme, whose light variant still applies
      in the export window)
- [x] ➕ **Decide:** block errors still print, so a broken song is not filed unnoticed
- [x] ➕ **Decide:** the "Include file name as title" heading is hidden by CSS in a note with a
      song (the header has the title); the README tip stays
- [x] ➕ **Decide:** title and page number on later pages of a song: a time-boxed spike with CSS
      `@page` margin boxes; kept only if it works with the default margins (it does)
- [x] ➕ **Decide:** PDF export on mobile is out of scope. Obsidian 1.15 adds it
      (`printToPdfMobile`: the note is rendered into `.print` in the main window, off screen at
      100vw, then copied as HTML and printed natively), so print mode will run there too; not
      checked in v1, and the 10 s timeout bounds the worst case
- [x] ➕ **Decide:** the v1 tag is `1.0.0` (`.npmrc` has no `v` prefix, as Obsidian requires)

### Tasks

- [ ] Implement the PDF route chosen in S2: native "Export to PDF" (`docs/spikes/s2-pdf.md`)
  - [ ] ➕ The handler returns a promise only during export (`el.closest('.print')`), with a
        10 s timeout so a stuck tab cannot hang the export (moved to Phase 4; recheck here)
  - [x] ➕ Waits for every block, including tabs not yet scrolled into view (Phase 4: print
        mode skips render-when-visible; a 4-tab export drew every tab)
- [ ] ➕ Phase 4 carry-over: its two open exit checks (tablet speed, Walk rhythm by ear), plus
      wrapping at phone width (340 px)
- [x] ➕ Bring the export driver (`scripts/spike-export-pdf.sh` and `.js` on `spike/s2-pdf`)
      into `scripts/` as a permanent check: vault guard, export settings restored afterwards,
      a check of the export window before printing (tabs drawn, nothing wider than the column),
      pages as images (`scripts/export-pdf.sh`. Baseline on 1.14.5: every tab drawn, ready in
      about 0.8 s; on A5 the 654 px tabs are cut and their rows overlap; "Melody" left alone at
      the bottom of an A4 page; chords print in the theme's accent colour)
- [ ] ➕ After Obsidian updates, re-run the S2 export check (it relies on Obsidian internals):
      on 1.14.5, and again on 1.15.0 (downloaded, not yet running)
- [x] ➕ Tab width from the export settings: page size, landscape, margins and downscale give
      the text column (pure geometry in `src/print/page.ts`, unit-tested; Obsidian's padding is
      measured in the export window. A5: 420 px, two bars per row; Letter landscape: five)
- [x] Print style: own light style, independent of the theme (R10) (checked with the app in
      dark theme and a custom accent colour: the PDF keeps its own colours)
  - [x] ➕ Under `.print .songfolio`, fixed values for the Obsidian colour variables the
        renderers use; the `--songfolio-tab-*` tokens follow (alphaTab reads them when it draws)
- [ ] Header on page 1 (R10)
  - [x] ➕ The header is never split
  - [x] ➕ The file name heading is hidden above a song (in any note with a song: Obsidian adds it
        as the only direct `h1` child of the print view; the note's own headings still print)
- [x] No strum or tab block split across pages (R10)
  - [x] ➕ alphaTab rows in normal flow in print, alphaTab's hidden footer kept hidden; a tab
        stays whole when it fits on a page and breaks only between rows when taller (measure its
        height against the page height to avoid a near-empty page) (kept whole up to 90 % of a
        page. On screen the footer was only clipped by the surface height: in print it showed,
        so it is now `display: none !important`)
  - [x] ➕ `%ascii` blocks and chord lines not split either; section titles not left alone at a
        page bottom (seen in Phase 4: a 4-tab export left "Verse" alone at the bottom of page 1)
        (`break-after: avoid` is honoured: "Melody" on A4 and "Intro" on A5 move with their tab)
- [x] ➕ Wide content fits the paper: the body and `%ascii` scroll on screen, which would cut
      them on paper; in print they overflow normally and a too-wide block is scaled to fit
      (CSS `zoom`, measured in the export window; a chord line only when one of its groups is
      wider than the page. Found on the way: Obsidian's `.markdown-rendered pre` made ASCII tab
      lines wrap in the export window, fixed. Follow-up if needed: a very wide ASCII tab gets
      small on A5; it could be split at bar lines instead)
- [ ] ➕ Check tabs on A4, A5, Letter, landscape and 80 % downscale
- [x] If S2 requires it: plugin's own export command (not needed, S2 chose native export)
- [x] ➕ Spike: song title and page number on later pages (see Decisions) (go: Electron prints
      CSS `@page` margin boxes. "Title · page 2 of 3" from page 2 on with the default margins;
      "minimal" and "none" leave no margin, so nothing shows there. Added during export as a
      constructed stylesheet (plugins may not add `<style>` elements), removed when the export
      unloads the block. Tried with scratch scripts, so no spike branch was needed)
- [ ] ➕ README: how to export; turn off "Include file name as title" (the header has it)
- [ ] ➕ Multi-page song check (a long song across 2+ pages: "Print layout" in the dev vault)
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
- [ ] ➕ **Decide:** are chord names inside `%tab` (`{ch "Am"}`) transposed? The spec says tab
      is never transposed, but those names also give header diagrams (Phase 4)
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
