# Songfolio

An Obsidian plugin that renders a complete guitar song from one `songsheet` code block:
chords over lyrics, sections, strumming patterns and tablature, with a styled header and a
print-ready PDF export.

> Status: v1 (rendering and PDF export). Importer, templates and transpose come next. See
> `docs/Songfolio - Requirements & Plan.pdf`.

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
