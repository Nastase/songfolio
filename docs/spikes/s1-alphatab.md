# Spike S1: alphaTab on desktop and Android

Branch: `spike/s1-alphatab` (throwaway, not merged). Spec: "Risks and technical spikes".
Status: **done, go.** Desktop measured on 2026-10-29, Android tablet on 2026-10-30.

## Result

| Check                                         | Desktop (Mac, Obsidian 1.14.4) | Android tablet  |
| --------------------------------------------- | ------------------------------ | --------------- |
| `%tab` renders as tab-only staff with rhythm  | Yes                            | Yes             |
| No network requests (font included)           | Yes                            | Yes (same build; font inlined) |
| 4 tab blocks, median of 5 opens (target < 1 s)| 16–32 ms                       | 28–63 ms (worst single open 158 ms) |
| Cold first render after plugin load           | 29–68 ms                       | 158 ms (first `lazy` open) |
| Plugin enable time, without → with alphaTab   | ~4 ms → ~9 ms                  | Not measured    |

**Go / no-go: go.** alphaTab renders on both devices with no network calls. The 4-tab song renders
in under 1 second on the tablet, about 15–35× under the target. Phase 4 can build on this setup.

Not measured on the tablet: plugin startup cost of the larger `main.js` (desktop: +5 ms) and the
`alphaTab import` log line. Remote debugging was not needed; the timing line in the block was
enough. Measure startup on the tablet in Phase 4 if startup ever feels slow.

## Versions and setup

- `@coderline/alphatab` **1.8.4** (pinned exactly), alphaTex syntax of 1.7+ (no `.` separators).
- Settings that work inside Obsidian:
  - `core.useWorkers: false`, `player.playerMode: PlayerMode.Disabled`, `core.engine: 'svg'`
  - `core.smuflFontSources: new Map([[FontFileFormat.Woff2, 'data:font/woff2;base64,…']])`
  - `notation.rhythmMode: TabRhythmMode.ShowWithBars`, `display.layoutMode: LayoutMode.Page`
  - `display.resources` colours resolved from Obsidian CSS variables (see "Theme")
- alphaTex built by the plugin: `\track "Guitar"`, `\staff {tabs}`, `\tuning (E4 B3 G3 D3 A2 E2)`
  (high to low, with octaves), then the block's beats.
- `new AlphaTabApi(el, settings)` then `api.tex(tex)`; `api.destroy()` from a
  `MarkdownRenderChild` registered with `ctx.addChild`.

## Fonts and assets

- Tab Flow cannot be copied here: it downloads the font and soundfont from GitHub on first run
  (a network call) and is desktop-only. This comes from its store listing and README; its source
  was not read in detail because the inlined-font approach below worked first time.
- Bravura is imported from `@coderline/alphatab/font/Bravura.woff2` with the esbuild loader
  `{ '.woff2': 'base64' }` and passed as a `data:` URL in `smuflFontSources`. alphaTab writes
  its own `@font-face` rule from it; `document.fonts` reports `alphaTab: loaded`.
- No soundfont is needed (player disabled). Only woff2 is shipped; Electron and Android WebView
  both support it.
- The only network request seen was Obsidian's own `api.obsidian.md/user/info`, which does not
  come from the plugin.

## Bundle and lazy loading

- Production `main.js`: **1.9 KB → 1.67 MB** (alphaTab ≈ 1.21 MB, Bravura base64 ≈ 0.42 MB).
- esbuild picks alphaTab's ESM build. In a CommonJS bundle `import.meta` becomes `{}`, so
  alphaTab's script-path detection returns nothing. That is harmless with workers off and the
  font supplied. esbuild gives no warning.
- Code splitting does not exist in CJS. `await import('@coderline/alphatab')` becomes a lazy
  `__esm` initialiser: alphaTab's module body runs only for the first song with `%tab`, but its
  code is still read and parsed with `main.js`.
- Measured cost (enable plugin, 5 runs): ~9 ms with alphaTab vs ~4 ms without; `onload` 1 ms.
  First `import()` 5–23 ms on desktop.

## Timing (desktop)

Measured from the processor call to the last block's first `renderFinished`, 4 blocks of 8 bars
(`dev-vault/Songs/Spike - four tabs.md`), 5 opens per mode, warm.

| Mode                                   | Live preview (first / all) | Reading view (first / all) |
| -------------------------------------- | -------------------------- | -------------------------- |
| `lazy` (alphaTab lazy loading, default)| 16–20 / 19–25 ms           | 12–16 / 15–19 ms           |
| `eager` (lazy loading off)             | 17–19 / 31–34 ms           | 13–16 / 25–28 ms           |
| `visible` (own IntersectionObserver)   | 14–17 / 24–28 ms *         | 10–11 / 18–26 ms *         |

\* Scrolled to the tabs. Opened at the top, only the block on screen renders.

- The actual render is fast: 5–12 ms per block; in Node the 4 blocks render in ~10 ms total.
- When the processor runs before the block is in the DOM, alphaTab waits for its container to
  become visible. That wait (50–125 ms between `scoreLoaded` and `renderStarted`) was the
  largest part of the time on a cold view. Blocks 2–4 also rendered twice (a resize pass).
- Live preview already skips code blocks outside CodeMirror's viewport and runs the processor
  when they scroll in, so long notes do not pay for off-screen blocks there.
- Obsidian keeps a hidden copy of the other view (reading vs. editing), and the processor
  runs for it too. alphaTab waits there because the copy is invisible, but the API objects are
  created. Phase 4 should avoid that.

### Render only when visible

- A plain `IntersectionObserver` with `rootMargin` does not work: the margin is ignored inside
  Obsidian's scroll container, and empty containers have zero height, so every block counts as
  visible at once.
- What works (spike `visible` mode): wait until the block is in the DOM, observe with
  `root = el.closest('.cm-scroller, .markdown-preview-view')` and a 200 px margin, and reserve an
  estimated height (~130 px per bar with one bar per row) until the first render.
- Risk for S2: blocks never scrolled into view stay empty, so PDF export must force them to
  render.

## Timing (Android tablet)

Same note, 5 opens per mode, value from the timing line shown in the block (ms):

| Mode      | Opens                  | Median |
| --------- | ---------------------- | ------ |
| `lazy`    | 158, 47, 45, 37, 36    | 45     |
| `eager`   | 63, 106, 103, 60, 56   | 63     |
| `visible` | 51, 46, 26, 27, 28     | 28     |

- The first `lazy` open (158 ms) was the first after the plugin loaded. It includes alphaTab's
  module initialisation and decoding the inlined font. Later opens are warm.
- `eager` (alphaTab's own lazy loading off) is the slowest mode. `visible` is the fastest because
  only the blocks on screen render when the note opens.
- **Recommendation for Phase 4:** keep alphaTab's default lazy loading and add our own
  render-when-visible (the fixed `visible` variant). The target is met without it, but it keeps
  long songs cheap and avoids creating alphaTab for the hidden copy of the other view. S2 must
  check that PDF export forces blocks that were never scrolled into view to render.

## alphaTex features

- **Chord names:** `{ch "Am"}` on a beat shows the name above the tab-only staff, even without
  a `\chord` definition. With `\chord ("Am" 0 1 2 2 0 x)` alphaTab also draws a diagram row above
  the staff (fingerings correct). Songfolio's header has its own diagrams, so Phase 4 should emit
  only `{ch}` (or turn off `NotationElement.ChordDiagrams`; names stay).
- Tuning from the `tuning` property ("E A D G B E", low to high) maps to `\tuning` high to low,
  each string in the octave nearest standard tuning (works for drop D).
- alphaTex errors arrive on `api.error`; the spike shows them on the block.

## Theme

- Colours are passed as `display.resources` (`mainGlyphColor`, `secondaryGlyphColor`,
  `staffLineColor`, `barSeparatorColor`, `barNumberColor`, `scoreInfoColor`). Obsidian
  variables are resolved to `rgb()` through a probe element (`--text-normal`, `--text-muted`,
  `--text-faint`). Checked in dark and light themes.
- alphaTab writes colours as SVG attributes, so CSS alone cannot recolour a rendered tab.
  Phase 4 needs a re-render on theme change (`css-change` workspace event).

## Things to clean up in Phase 4

- Hide the track name ("Guitar"), the "Guitar Standard Tuning" label (`\tuning (…) { hide }`) and
  the default `f` dynamic.
- alphaTab always draws a "rendered by alphaTab" footer as its own element. No setting turns it
  off. It can be hidden with CSS, but its height stays reserved. MPL does not require it;
  decide in Phase 4 (credit alphaTab in the README either way).
- Page layout shows one 8th-note bar per row at ~550 px; check `display.scale` /
  `display.barsPerRow` for denser rows, especially on the tablet and phone.
- Start alphaTab only once the block is attached and visible, so it neither waits nor renders
  twice.
- Console: store rules allow only `console.debug/warn/error`; the spike logs with
  `console.debug` (turn on "Verbose" in DevTools to see it).

## Licences

- alphaTab: **MPL-2.0** (file-level copyleft). It can be bundled into an MIT plugin unmodified;
  keep its notice, and note in the README where its source is. Its bundled parts (TinySoundFont,
  SFZero, Haxe std, SharpZipLib, NVorbis: MIT; libvorbis: BSD-3-Clause) are listed in its
  `LICENSE.header`.
- Bravura: **SIL OFL 1.1**, © Steinberg. Embedding in software is allowed; ship the OFL text
  with the plugin's notices, and do not sell the font on its own.
- Neither blocks the community store. Phase 8: add both to the third-party notices.

## Tablet procedure (Obsidian Sync)

Sync's "vault configuration sync" toggles are per device: they must be turned on on the tablet
too, otherwise it never downloads `.obsidian/plugins/`. Restart Obsidian on the tablet after the
plugin files arrive.


1. On the Mac, open `dev-vault`. In Settings → Sync, create a remote vault and connect.
   Turn on "Installed community plugins" and "Active community plugin list".
2. `npm run spike:deploy` (production build into the dev vault). Wait for Sync to upload.
3. On the tablet, connect to the same remote vault. Turn on community plugins and Songfolio.
   After each deploy, toggle Songfolio off and on (Hot Reload does not run on mobile).
4. Remote debugging: Developer options → USB debugging on the tablet, USB cable, open
   `chrome://inspect` on the Mac, inspect the Obsidian WebView, set the console level to
   Verbose and filter `songfolio:s1`. Without it, read the timing line printed in the block.
5. Open "Wayfaring Stranger", then "Spike - four tabs" 5 times per `s1-mode` (`lazy`, `eager`,
   `visible`), opened at the top. Record the "first / all" line, the `alphaTab import` and
   `onload` log lines, and how smooth scrolling feels.
6. Afterwards, `git status` must show no Sync or workspace files in the repo.
