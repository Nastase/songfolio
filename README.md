# Songfolio

An Obsidian plugin that renders a complete guitar song from one `songsheet` code block:
chords over lyrics, sections, strumming patterns and tablature, with a styled header and a
print-ready PDF export.

> Status: Phase 0 (project setup). See `docs/Songfolio - Requirements & Plan.pdf`.

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
| `npm test`          | Run the Vitest suite once (`npm run test:watch` to watch) |
| `npm run lint`      | ESLint with Obsidian's plugin rules                  |
| `npm run typecheck` | TypeScript check only                                |

## Licence

MIT. Songfolio will reuse code from Chord Sheets (MIT); its notice will be kept alongside.
