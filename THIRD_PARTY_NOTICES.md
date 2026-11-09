# Third-party notices

Songfolio includes code from the projects below. Their licences follow.

## Chord Sheets

- Source: https://github.com/olvidalo/obsidian-chord-sheets
- Version: 1.11.0, commit `e563134dece0e4d09d1b647f07b620022427d980`
- Used in: `src/parser/chordsheets/` (chord symbol parsing and line tokenizer) and
  `test/chordsheets/` (its tests), adapted to Songfolio's TypeScript settings. Each file names
  its original path.

```
MIT License

Copyright (c) 2023 Marcel Schaeben

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## tonal

- Source: https://github.com/tonaljs/tonal
- Version: 6.2.0 (bundled in `main.js`)
- Licence: MIT, Copyright (c) 2015 danigb

## chords-db

- Source: https://github.com/olvidalo/chords-db, the fork used by Chord Sheets, of
  https://github.com/tombatossals/chords-db
- Version: 0.5.1, commit `1c2fa6ac3be52843b93a1f76de49b18c3044ec05`
- Used in: the guitar fingerings (`lib/guitar.json`, bundled in `main.js`). No other instrument
  is bundled.
- The fork's guitar corrections come from https://github.com/tabsy-gr/chords-db (MIT). Its
  README also names `7b13` shapes from chord.farm; the guitar data at this commit has no `7b13`
  chords, so none are bundled.

```
MIT License

Copyright (c) 2016 David Rubert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
