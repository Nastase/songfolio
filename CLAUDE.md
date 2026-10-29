# Songfolio

Obsidian plugin that renders a full guitar song (chords over lyrics, sections, strumming
patterns, alphaTab tablature, ASCII tab, header with chord diagrams) from one `songsheet`
code block, with PDF export on desktop.

The spec is `docs/Songfolio - Requirements & Plan.pdf`: syntax, properties, requirements
R1–R17, architecture, risks and the phased plan. Read the relevant section before starting
a phase. Work one phase per session, starting from that phase's exit criteria.
General Obsidian plugin guidelines (manifest, releases, store policies, UX copy) are in
`AGENTS.md`.

## Commands

- `npm run dev`: watch build straight into `dev-vault/.obsidian/plugins/songfolio`
  (Hot Reload picks it up; run `npm run setup:vault` once after cloning).
- `npm run build`: `tsc` check + production `main.js` at the repo root.
- `npm test` / `npm run test:watch`: Vitest, tests in `test/`, fixtures in `test/fixtures/`.
- `npm run lint`, `npm run typecheck`.

Run `npm run typecheck && npm test && npm run lint` before calling a change done.

## Architecture

One parser feeds every renderer, on screen and in the PDF.

- `src/parser/`: the only code that understands the block syntax; produces the song model.
- `src/model/`: song model types.
- `src/render/{header,lyrics,strum,tab,ascii}`: renderers that read the model.
- `src/commands/{import,transpose,template}`: commands (importer, transpose, template/base).
- `src/print/`: PDF / print styling and export.
- `src/main.ts`: lifecycle only (register code block processor, commands, settings).

## Rules

- `src/parser` and `src/model` must not import `obsidian` (enforced by ESLint) so they stay
  unit-testable in Node.
- Must run on Android: no Node or Electron APIs outside the desktop-only PDF code; guard
  those with `Platform.isDesktop`. Keep `isDesktopOnly: false`.
- alphaTab is loaded lazily, only when a song contains `%tab`.
- Rendering uses the code block processor only; no CodeMirror editor extension.
- Use Obsidian CSS variables so blocks follow the theme; print uses its own light style.
- Store-ready from day one: sentence-case UI text, stable command IDs, no network calls.
- Code reused from Chord Sheets (MIT) must keep its licence notice.
- Tabs for indentation, single quotes (see `.editorconfig`).

## Commits

Every commit message follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short imperative summary>

<optional body: what and why>

<optional footer: BREAKING CHANGE: ..., refs>
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
  `chore`, `revert`.
- Scopes follow the source layout: `parser`, `model`, `header`, `lyrics`, `strum`, `tab`,
  `ascii`, `import`, `transpose`, `template`, `print`, `settings`, `vault`, `deps`.
  Spikes use `spike`, e.g. `feat(spike): render one %tab block with alphaTab`.
- Summary in lowercase, imperative, no trailing period, about 72 characters max.
- Breaking changes (for example to block syntax or property names) use `!` after the
  type/scope and a `BREAKING CHANGE:` footer.
- One logical change per commit.

## Dev vault

`dev-vault/` holds 5 public-domain test songs in `Songs/`; each note says which features it
exercises (one has a deliberate wrong slot count for R7). Built plugins and workspace state
are gitignored.

## Status

Progress is tracked in `docs/HANDOFF.md`: one checkbox per task, phase by phase. Read it at the
start of each session and tick tasks as they are done.
