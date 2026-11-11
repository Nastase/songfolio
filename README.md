# Songfolio

An Obsidian plugin that renders a complete guitar song from one `songsheet` code block:
chords over lyrics, sections, strumming patterns and tablature, with a styled header and a
print-ready PDF export.

> Status: v1 (rendering and PDF export), plus the song library and the importer. Transpose comes
> next. See `docs/Songfolio - Requirements & Plan.pdf`.

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
`started` and `learned` dates, `tags` tags, the rest text. If a property already had another
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
