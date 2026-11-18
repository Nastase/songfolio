# Songfolio

An Obsidian plugin that renders a complete guitar song from one `songsheet` code block:
chords over lyrics, sections, strumming patterns and tablature, with a styled header and a
print-ready PDF export.

> Status: v1 (rendering and PDF export), plus the song library, the importer, transpose,
> autoscroll and editing help. See `docs/Songfolio - Requirements & Plan.pdf`.

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

- **Autoscroll:** the play button at the top right of the header, or **Start or stop
  autoscroll**. It first brings the song's first section to the top of the screen, past the
  header, then plays from there (a song you are already into carries on where it is). With a
  `duration` property (`3:45`) the song scrolls to its end in that time;
  without one, at the **Autoscroll speed** of the settings (lines per minute, 30 by default).
  Scrolling yourself, or the end of the song, stops it; the screen stays on while it scrolls.

## Writing a song

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

## Credits

Tabs are drawn by [alphaTab](https://alphatab.net) (MPL-2.0, source at
https://github.com/CoderLine/alphaTab) with the Bravura music font (SIL OFL 1.1). Chord parsing
and the chord library lookup come from [Chord Sheets](https://github.com/olvidalo/obsidian-chord-sheets)
(MIT), and the fingerings from chords-db (MIT).

## Licence

MIT. Licences of the bundled code and font are in `THIRD_PARTY_NOTICES.md`.
