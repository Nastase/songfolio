# Songfolio

Write a guitar song once and play it from Obsidian: chords over lyrics, sections, strumming
patterns, chord diagrams and tablature, all from one `songsheet` code block, with a header built
from the note's properties and a clean PDF for your binder.

<!-- SCREENSHOT: a song on screen, light theme: header with chord diagrams and a strumming
     pattern, a verse with chords over lyrics, a tab (docs/images/song.png) -->

- **Chords over lyrics** that stay aligned, from plain chord sheets you already have.
- **Strumming patterns** drawn as arrows, checked against the time signature.
- **Chord diagrams** for every chord in the song; click one to pick another fingering.
- **Tablature** with rhythm, written in alphaTex and drawn by alphaTab, and plain ASCII tab.
- **A song library** with Bases: new songs from a template, an importer for songs copied from
  Ultimate Guitar or Cifra Club, and a starter base.
- **Transpose**, capo changes, autoscroll and editing help.
- **PDF export** in a light print style, with tabs and patterns never split across pages.

Works on desktop and mobile; PDF export needs the desktop app.

<!-- SCREENSHOT: a printed page from Export to PDF (docs/images/print.png) -->

## Installing

In Obsidian, open **Settings → Community plugins → Browse**, search for "Songfolio", then
select **Install** and **Enable**.

To install a release by hand, copy `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/Nastase/songfolio/releases/latest) into
`<your vault>/.obsidian/plugins/songfolio/`, reload Obsidian and enable Songfolio.

To start, run **New song** from the command palette, or put any chord sheet in a code block:

````markdown
```songsheet
[Verse]
C                  G
First lyric line here
F                            G
Second lyric line
```
````

## Writing a song

A song is one code block named `songsheet` (the name can be changed in the settings). A plain
song is chord lines over lyric lines, so an existing chord sheet works as it is. Everything else
is a line that starts with `%`.

```songsheet
%pattern Ballad 8: d.d. dudu
%pattern Push 16: D.du .udu x.du .udu
%shape F 1 3 3 2 1 1

[Intro] (fingerpicked)
%strum Ballad
C  G  F  G

[Verse]
%strum Ballad
C                  G
First lyric line here
F                            G
Second lyric line
%strum Push
A line with [Am]inline [F]chords

[Solo]
%tab
:8 8.3{h} 10.3{v} 10.3 8.3 6.3
%endtab

[Outro]
%ascii
e|-----------------|
B|--9/11-11--------|
%endascii
```

### Chords and lyrics

- A line is a **chord line** when more than half of its words are chords or rhythm marks (`|`,
  `/`, `%`, `N.C.`); any other line is lyrics. A chord line is drawn over the lyric line below
  it, each chord over the column it is written at (a tab character counts as 4 columns).
- End a line with `%c` to make it a chord line, or with `%t` to make it lyrics, when the guess
  is wrong.
- `[Am]` inside a lyric line is an **inline chord**, drawn above that point of the line. Text
  after the chord stays with it: `[F# softly]`.
- Chord symbols start with an uppercase root, `A` to `G`, with `#` or `b`. Pop and jazz
  spellings and the Brazilian cifra are read: `Am7`, `D/F#`, `Cmaj7`, `C-7`, `CΔ`, `C°7`, `Cø`,
  `G7(b9)`, `C6/9`, `C7M`, `C7(4/9)`, `Bm7(5-)`. Words such as `a`, `am` or `Go` stay lyrics.
- Other words on a chord line, such as `x4` or `(riff)`, are kept where they are. A shape
  written after a chord, as in `C[x32010]`, is not used: give the fingering with `%shape`.

### Sections

- `[Name]` alone on a line starts a section: `[Verse 1]`, `[Chorus]`. Text after it is a note
  shown beside the title: `[Intro] (fingerpicked)`.
- A line such as `[Intro] C G D` stays a chord line, and `[Am] words` a lyric line with an inline
  chord.

### Strumming patterns

- `%pattern <name> <grid>: <slots>` defines a pattern. The grid is `8` or `16`, the note value
  of one slot. Every pattern is drawn in the header.
- Slots, with spaces ignored, so they can be written in groups of 4:

  | Slot | Meaning |
  | --- | --- |
  | `d` | Down stroke |
  | `u` | Up stroke |
  | `x` | Muted stroke, in the direction of its slot: down on the beat (and on the `&` of the 16 grid), up between |
  | `.` or `-` | No stroke; the hand keeps moving |
  | `D` `U` `X` | The same stroke, accented |
  | `\|` | End of a bar (optional, checked) |

- The slot count is checked against the `time` property: a pattern fills whole bars, 2 slots per
  beat on the 8 grid and 4 on the 16 grid, so a 4/4 bar is 8 or 16 slots. Any n/4 time is
  checked, 4/4 when `time` is empty. Other time signatures, such as 6/8, draw the patterns
  without checking them, with a note on the block.
- `%strum <name>` on the line after a section header gives the section its pattern, named
  beside its title. Later in a section, it changes the pattern from that line on. Add `+draw`
  to draw the pattern in the section as well: `%strum Ballad +draw`.
- Pattern names match in any case and may hold spaces, but not `+`. A pattern can be defined
  anywhere in the block, usually at the top.

### Chord diagrams and shapes

- The header shows a diagram for every chord of the chord lines and inline chords, in standard
  guitar fingerings from a built-in library. A chord the library does not know gets a
  placeholder. A song with no chord lines shows the chords named in its tabs instead.
- Click a diagram to pick another fingering of that chord: Songfolio writes a `%shape` line at
  the top of the block, used on screen and in the PDF.
- `%shape <chord> <frets>` can also be written by hand. Frets run from the low E string to the
  high E string, separated by spaces (`x 3 2 0 1 0`, `8 10 10 9 8 8`) or one character per
  string (`x32010`): `x` mutes a string, `0` leaves it open, frets go up to 24. The chord name
  must match the song's chord exactly.

### Tablature

- `%tab` … `%endtab` holds the beats of a tab in [alphaTex](https://alphatab.net/docs/alphatex/introduction),
  which [alphaTab](https://alphatab.net) draws as a tab staff with rhythm. Songfolio adds the
  track, the staff and the tuning from the `tuning` property, so the block holds only beats:
  `:8 0.5 2.4 2.3 | :4 3.6{ch "G"} 0.4`.
- Bar settings such as `\ts`, `\tempo`, `\section` and repeats can be used. Settings for the
  whole score, track or staff (`\title`, `\track`, `\tuning`, `\capo`, `\transpose`…) cannot:
  their line is left out, with an error.
- `{ch "Am"}` on a beat writes the chord name above it.
- A tab is drawn when it scrolls into view, so long songs open quickly.

### ASCII tab

- `%ascii` … `%endascii` holds plain ASCII tab, shown in a monospace box that never wraps and
  scrolls sideways on narrow screens.
- Raw tab lines that follow each other, such as `e|--3--|`, get the same box without the
  directive.
- **Convert ASCII tab to %tab** turns one into a `%tab` block: see
  [Importing a song](#importing-a-song).

### Errors

Problems are listed at the top of the block with their line: an unknown directive or pattern, a
pattern with the wrong number of slots, a `%tab` without `%endtab`, a `%shape` with 5 strings.
The rest of the song is still drawn.

## Song properties

The header is built from the note's properties. None is required; the title defaults to the
note's name.

| Property | Example | In the header | Notes |
| --- | --- | --- | --- |
| `title` | Scarborough Fair | Yes | The note's name when empty |
| `artist` | Traditional | Yes | |
| `key` | Am | Yes | The key of the chord shapes; the header adds the sounding key, from `capo` and `tuning` |
| `capo` | 2 | Yes | 0 or empty for no capo |
| `tuning` | `E A D G B E` | Yes | Low to high, also `EADGBE`, or a name: standard, drop D, half step down, Eb standard, whole step down, D standard, open D, open G. Tabs use it too |
| `tempo` | 100 | Yes | In bpm |
| `duration` | `3:45` | Yes | For autoscroll |
| `time` | 3/4 | | Time signature for strumming patterns; 4/4 when empty |
| `difficulty` | intermediate | Yes | |
| `status` | learning | | `to_start`, `learning`, `polishing` or `learned`, for the base |
| `started`, `learned` | 2026-11-10 | | Dates, for the base |
| `source` | a link | | |
| `tags` | genre/folk | | |

## Song library

Three commands build the library. New and imported songs go in the **Song folder** of the
settings (`Songs` by default), named "Artist - Title".

- **New song** asks for the title and artist, then creates a note with every song property
  filled in and an empty `songsheet` block.
- **Create starter songs base** creates `Songs.base` in the song folder with the views "Learning
  now", "To start", "By artist" and "Learned". An existing `Songs.base` is opened unchanged.
- **Import song from clipboard** reads a song copied from Ultimate Guitar or Cifra Club. See
  [Importing a song](#importing-a-song).

Every new and imported song gets the **Song property** of the settings (`type: guitar_song` by
default), which is how the base finds songs: give your existing songs the same property to list
them. `status` takes `to_start`, `learning`, `polishing` or `learned`.

To add your own properties, point **Song template** at a note: its properties are added to every
new and imported song, and its values replace the defaults. `{{title}}`, `{{date}}` and `{{time}}`
in its text values are filled in (with a format: `{{date:YYYY-MM-DD HH:mm}}`). Only the
properties are used, not the note's text.

Bases sorts and filters by property type. Songfolio gives the song properties their types the
first time it creates a song or the base, if they have none yet: `capo` and `tempo` are numbers,
`started` and `learned` dates, `tags` tags, the rest text (`duration` too: write it as `3:45`). If a property already had another
type, change it in the Properties view: click its icon and pick the type.

## Importing a song

Copy the whole song from the site, from the title to the last line, then run **Import song from
clipboard**. The dialog shows the pasted text, the title and artist it found (change them if they
are wrong) and what it read: key, capo, tuning, sections, tabs. When the clipboard cannot be read,
as can happen on Android, paste into the box.

- Title, artist, key, capo, tuning, tempo and difficulty are read when the page shows them.
- Sections are kept as written; a label alone on a line, such as `Chorus:`, becomes a section.
- Pasted ASCII tab goes into `%ascii` boxes, one per system, with the chord or label line just
  above it, so the chords stay over their columns.
- The song is copied as is otherwise. Check it once: a lyric line read as chords takes `%t` at
  its end, a chord line read as lyrics takes `%c`.
- **Convert ASCII tab to %tab** turns the ASCII tab at the cursor (an `%ascii` box or tab lines)
  into a `%tab` block below it, keeping the original. ASCII tab has no rhythm, so every beat starts
  as an 8th note: fill in the durations, then delete the `%ascii` box. Frets, chords, bar lines,
  `h` `p` `/` `\` `b` `~` `x` and chord names above the tab are kept.

## Transposing

These commands work on the song under the cursor, or on every song in the note in reading view:

- **Transpose up a semitone** and **Transpose down a semitone** move every chord, and the `key`
  property with them. Chords are spelled like the new key: sharps in sharp keys (G, D, A…),
  flats in flat keys (F, Bb, Eb…). Chords keep their columns over the lyrics.
- **Switch sharps and flats** writes the chords and the key the other way (F# ↔ Gb).
- **Raise capo, keep the sound** and **Lower capo, keep the sound** move the capo by one fret and
  the chords the other way, so the song sounds the same with easier or different shapes.

Tab (`%tab`, `%ascii`) is never transposed. A `%shape` follows its chord: a barre shape moves up
or down the neck, a shape with open strings goes back to the library fingering. In live preview
one undo brings back the block and the key. The **−** and **+** buttons at the top right of the
header transpose that song down or up a semitone, like the commands, in reading view and live
preview. On a phone or tablet, the other commands can go on the mobile toolbar.

## Playing a song

- **Autoscroll:** the play button at the top right of the song, or **Start or stop
  autoscroll**. It first brings the song's first section to the top of the screen, past the
  header, then plays from there (a song you are already into carries on where it is). With a
  `duration` property (`3:45`) the song scrolls to its end in that time;
  without one, at the **Autoscroll speed** of the settings (lines per minute, 30 by default).
  Scrolling yourself, or the end of the song, stops it; the screen stays on while it scrolls.
  The play and transpose buttons stay at the top of the screen while you scroll through the
  song, so you can start from the lyrics.

## Editing help

In source mode, and in live preview while the cursor is in the block:

- **Autocomplete:** type `%` at the start of a line for the directives (`%tab` and `%ascii` add
  their end line), after `%strum ` for the song's patterns and `+draw`, after `%shape ` for its
  chords with the library fingering, and ` %` at the end of a line for `%c` / `%t`.
- **Highlighting:** directives, section headers, chords and tab in the theme's code colours.

## Printing a song

Use Obsidian's own **Export to PDF** (desktop) on a song note. Songfolio prints in its own light
style, whatever the theme, and waits for every tab to be drawn.

- Any page size, orientation, margin and downscale of the export dialog works: tabs are drawn
  at the width of the chosen page.
- Keep the default margins to get "Title · page 2 of 3" at the bottom of later pages; with
  "Minimal" or "None" there is no room for it.
- "Include file name as title" can stay off: the song header already shows the title (Songfolio
  hides that heading in a note with a song).
- Properties are never printed, but the header shows the ones it uses. Text outside the
  `songsheet` block prints too.
- A tab is kept on one page when it fits, and otherwise breaks only between rows; strumming
  patterns, chord lines and ASCII tabs are never split, and section titles stay with what follows.
  An ASCII tab wider than the page is scaled down to fit.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| Code block name | `songsheet` | The code block language Songfolio draws; reload the plugin after changing it |
| Lyrics font | Monospace | Monospace keeps the spacing as typed; the theme text font also keeps chords over their words |
| Space after lyric lines | On | Half a line after each lyric line, apart from the next chords |
| Autoscroll speed | 30 | Lines per minute, for songs without `duration` |
| Song folder | `Songs` | Where new and imported songs and the starter base go |
| Song property | `type: guitar_song` | Given to every new and imported song; the base lists the notes that have it |
| Song template | none | A note whose properties are added to new and imported songs |

## Privacy

Songfolio works offline and makes no network requests. The chord library and the music font
are inside the plugin, and nothing is sent anywhere. It changes only what you ask it to: a
song's block and properties (transpose, capo, a fingering you pick, a converted tab), the notes
its commands create, and the type of a song property that has none yet. **Import song from
clipboard** reads the clipboard only when you run it.

## Limits

- Six-string guitar only.
- Strumming patterns are checked in n/4 time only; others are drawn unchecked.
- PDF export needs the desktop app.
- Source-mode highlighting relies on an undocumented Obsidian feature (CodeMirror 5 modes). If a
  future Obsidian drops it, songs show as plain text in source mode, and nothing else changes.

## Development

```bash
npm install
npm run setup:vault   # once: installs the Hot Reload plugin into dev-vault/
npm run dev           # builds into dev-vault/.obsidian/plugins/songfolio and watches
```

Open `dev-vault/` as a vault in Obsidian and enable community plugins. Every rebuild reloads
the plugin automatically.

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Watch build into the dev vault                       |
| `npm run build`     | Type-check and build `main.js` for release           |
| `npm run build:vault` | Production build into the dev vault (for the tablet; stop `npm run dev` first, or its next rebuild replaces it) |
| `npm test`          | Run the Vitest suite once (`npm run test:watch` to watch) |
| `npm run lint`      | ESLint with Obsidian's plugin rules                  |
| `npm run typecheck` | TypeScript check only                                |
| `scripts/export-pdf.sh` | Run "Export to PDF" on a dev-vault note and check the pages (after print changes or Obsidian updates) |

### Releasing

1. On `main`, run `npm version minor` (or `patch`, `major`). It sets the version in
   `package.json` and `manifest.json`, adds it to `versions.json` with the manifest's
   `minAppVersion`, commits it as `chore: release x.y.z` and tags it (no `v` prefix, as Obsidian
   requires; both set in `.npmrc`).
2. `git push --follow-tags`. The release workflow checks that the tag, `manifest.json`,
   `package.json` and `versions.json` agree, runs the type check, tests and lint, builds, and
   creates a draft release with `main.js`, `manifest.json`, `styles.css` and a provenance
   attestation.
3. Check the draft on GitHub, then publish it: Obsidian installs only published releases.

## Credits

Tabs are drawn by [alphaTab](https://alphatab.net) (MPL-2.0, source at
https://github.com/CoderLine/alphaTab) with the Bravura music font (SIL OFL 1.1). The guitar
fingerings come from [chords-db by Tabsy](https://github.com/tabsy-gr/chords-db) (MIT).

## Licence

MIT. Licences of the bundled code, data and font are in `THIRD_PARTY_NOTICES.md`.
