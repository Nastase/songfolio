# Spike S2: native PDF export of a song with tab

Branch: `spike/s2-pdf` (throwaway, on top of `spike/s1-alphatab`, not merged). Spec: "Risks and
technical spikes". Status: **done. Route: Obsidian's native "Export to PDF"**, with print-aware
rendering in the plugin. No export command of our own. Measured on 2026-10-30, Mac, Obsidian
1.14.4 (export code identical in 1.14.5), A4.

## Result

| Check                                              | Native export, S1 code as-is | Native export, S2 changes |
| -------------------------------------------------- | ---------------------------- | ------------------------- |
| All tabs drawn (4-tab note)                        | No: only the first tab       | Yes                       |
| Tabs fit the A4 width                              | No: cut on the right         | Yes (654 px, scale 0.8)   |
| S1 render-when-visible                             | 2 of 4 tabs drawn            | Bypassed in print: 4 of 4 |
| Cold export (alphaTab never loaded this session)   | –                            | Music glyphs present      |
| App in dark theme                                  | PDF is light                 | PDF is light              |
| Tab or strum block split across pages              | Tab rows overlap at the break| Never inside a row; whole tab when it fits |
| Letter, landscape, minimal margins, 80 % downscale | –                            | All fit                   |
| Real song (Wayfaring Stranger)                     | –                            | 2 pages, correct          |
| Time for tabs to be ready in the print window      | –                            | 16–89 ms                  |

**Decision: native export.** Every failure had a fix inside the plugin (the block's handler and
print CSS), so the plugin's own export command is not needed. That also keeps all PDF code free
of Electron APIs. The spec's fallback (hidden container + `printToPDF`) stays the plan B if a
future Obsidian release breaks the points under "Risks".

## How Obsidian exports a note

Read from Obsidian's `app.js` (`printToPdf` and `print` in the export modal) and checked against
the runs:

1. The export modal saves its options (`pdfExportSettings` in `.obsidian/app.json`), asks for a
   file name, then opens a **hidden popup window** (`window.open(…, 'popup,hide=true')`, measured
   1024×800).
2. The main window's `<style>`/`<link>` tags are mirrored into the popup and kept in sync by a
   MutationObserver. Plugin `styles.css` therefore applies.
3. The popup body is forced to `theme-light`, whatever the app theme.
4. The whole note (no virtualisation) is rendered into
   `body > .print > .markdown-preview-view` and the post-processors run once over it. The
   `songsheet` block is already attached when its handler runs, so `el.closest('.print')`
   detects export.
5. Any promise returned by a code block handler is collected (`ctx.promises`); the export does
   `await Promise.all(promises)`, then waits 200 ms, then calls Electron's
   `webContents.printToPDF` on the popup. **Returning a promise is how a plugin makes export wait.**
6. Afterwards the render component is unloaded, so `ctx.addChild` cleanup (`api.destroy()`) runs.

Desktop only: Obsidian offers "Export to PDF" only where it can (`canExportPdf`), so Android
needs no PDF code at all.

## What failed with S1's code, and the fix

- **Blank tabs.** The handler returned nothing, and alphaTab's lazy loading only draws rows that
  intersect the popup's 800 px viewport. Fix: during export, turn lazy loading off and return a
  promise that resolves on every tab's `postRenderFinished` (or `error`), with a 10 s timeout so a
  stuck tab can never hang the export. `renderFinished` is not enough: with lazy loading it fires
  before rows are drawn.
- **Render-when-visible.** S1's IntersectionObserver never fires for blocks below the popup's
  viewport; a promise tied to it would hang the export. Fix: bypass it in print.
- **Cut on the right.** alphaTab sizes to its container when it renders (960 px in the popup); the
  A4 text column with default margins is ~654 px (A4 794 px − 2 × 1 cm margins − 2 × 32 px
  Obsidian padding). Fix: give the tab container a fixed 654 px width while printing. It then fits
  Letter, landscape, minimal margins and any downscale (on wider columns it simply doesn't widen).
- **Density.** At 654 px and scale 1 alphaTab fits one or two 8th-note bars per row; at
  `display.scale` 0.8 it fits two per row and fret numbers stay readable.
- **Page breaks.** alphaTab draws each row as a full-width, absolutely positioned box. With
  `break-inside: avoid` on the whole tab, a tab taller than a page jumps to a new page and then two
  rows overlap where the page breaks. Fix: print CSS that puts the rows back in normal flow
  (`position: relative; top: auto`, surface `height: auto`) with `break-inside: avoid` on each row,
  plus `break-inside: avoid` on the tab. A tab that fits stays whole; a longer one breaks only
  between rows. Strum stand-ins (plain boxes) are never split.

Spike CSS (on the branch, `styles.css`):

```css
.print .songfolio-strum, .print .songfolio-print-keep { break-inside: avoid; }
.print .songfolio-print-rows .at-surface { height: auto !important; }
.print .songfolio-print-rows .at-surface > div {
	position: relative !important; top: auto !important; left: auto !important;
	display: block !important; break-inside: avoid;
}
```

## Runs

Driven by `scripts/spike-export-pdf.sh` on the branch (Obsidian CLI: opens the note, stubs the
save dialog to a path, clicks Export, stops the PDF opening in the viewer, then restores both).
Pages were checked as images (`pdftoppm`).

| # | Note | Settings | Result |
|---|------|----------|--------|
| 1 | Spike - four tabs | S1 code (lazy, nothing awaited) | 3 pages; tab 1 drawn but cut, tabs 2–4 blank |
| 2 | four tabs | await, no width fix | all 4 drawn, all cut on the right; no tab split |
| 2b | four tabs | await, 654 px, scale 1 | fits; 1–2 bars/row, 8 bars ≈ ⅔ page, big gaps |
| 3 | four tabs | S1 `visible` mode, naive / await | 2 of 4 drawn / 4 of 4 drawn, no hang |
| 4 | four tabs | plugin reloaded, note in source mode (no tab on screen before export) | glyphs present, ready after 89 ms |
| 5 | four tabs | app theme dark | light colours in the PDF |
| 6a | Spike - print layout (≈5 pages) | whole-tab avoid | 24-bar tab: jumps a page, rows overlap at the break |
| 6b/c | print layout | rows in flow, scale 1 / 0.8 | breaks between rows only; 6 / 5 pages |
| 6d | print layout | rows in flow + keep whole (chosen) | short tabs whole; 24-bar tab starts a new page, then breaks between rows |
| 7 | print layout | Letter; A4 landscape; minimal margins; 80 % | all fit, nothing cut |
| 8 | Wayfaring Stranger | defaults (no spike properties) | 2 pages, tab correct; ASCII tab split (see below) |

## What native export allows

- Options: include file name as title, page size (A3, A4, A5, Legal, Letter, Tabloid), landscape,
  margins (default ≈ 1 cm, minimal, none), downscale 10–100 %. Remembered per vault.
- No headers, footers or page numbers. No way for a plugin to read the chosen page size before
  rendering, hence the fixed print width.
- **Properties are never printed** (`.print .metadata-container { display: none }`), so the
  Songfolio header must show everything needed on paper (it does by design, R3).
- "Include file name as title" adds an `<h1>` above our header: the user should turn it off.
- The whole note prints, including text outside the `songsheet` block.

## What Phase 4 and 5 must do

Phase 4 (`src/render/tab`):
- Accept a print flag: lazy loading and render-when-visible off, fixed width and scale, and a
  promise that resolves on `postRenderFinished`/`error` for every tab.
- Fix an alphaTab 1.8.4 leak: `createSharedStyleElement` looks for `#alphaTabStyle` but creates
  `#alphaTabStyleShared`, so every `AlphaTabApi` appends another copy to the main `document.head`
  (13 copies after this spike). Create one `#alphaTabStyle` element up front, or remove duplicates.
- alphaTab writes its `@font-face` into the block's own document (the print popup gets its own);
  the font had loaded by print time in every run, including cold.

Phase 5 (`src/print`):
- Handler returns the promise only when `el.closest('.print')`, never in reading view or live
  preview (holding those up would be pointless and could stall rendering).
- Print width: 654 px default for A4 with default margins; consider a setting (A4 / Letter) only
  if Letter users appear.
- Keep a tab whole only when it fits on a page: measure the rendered height in print and drop
  the "keep" class when it is taller than ~1 000 px, to avoid the near-empty page seen in 6d.
- `break-inside: avoid` on strum blocks and on `%ascii` blocks (run 8 left the ASCII tab's last
  line on page 2); `break-after: avoid` on section titles (runs 2–3 left `[Verse]`/`[Melody]` alone
  at the bottom of a page).
- Print style independent of the theme is already guaranteed by `theme-light`; our own print
  colours go under `.print .songfolio`.
- Tell users (README) to turn off "Include file name as title".

## Risks of the native route

- It relies on Obsidian internals: the `.print` class, the hidden popup and the 200 ms delay. The
  promise wait itself is part of the public handler signature (`Promise<any> | void`). After an
  Obsidian update, re-run `scripts/spike-export-pdf.sh` on the print layout note (Phase 5 should
  keep an equivalent check).
- If export detection ever fails, tabs fall back to S1 behaviour (some blank, cut). The timeout
  bounds the worst case at 10 s.

## Tooling notes

- The Obsidian CLI acts on the vault of the current directory or the focused window: **always pass
  `vault=dev-vault`**. The spike script refuses to run if the CLI reaches another vault.
- `dev:console` needs `dev:debug on` first; `console.debug` lines show with `level=debug`.
- The print popup has its own Node context: patching the main window's `ipcRenderer` does not
  affect it (the script patches the popup's).
- The export dialog writes `pdfExportSettings` to `dev-vault/.obsidian/app.json` (tracked); revert
  it after running exports.
