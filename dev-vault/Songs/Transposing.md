---
title: Transposing
artist: Traditional
key: F
capo: 0
tuning: E A D G B E
tempo: 72
duration: 1:10
time: 4/4
difficulty: beginner
status: learning
source: Traditional (public domain)
tags:
  - genre/folk
type: guitar_song
---

Covers the transpose commands (R13) and the capo commands. In F, so chords use flats; up a semitone
gives F#: sharps. `%shape Bb` is a closed barre at fret 1: up it moves, down it would leave the neck
and is removed. `%shape C` has open strings, so transposing removes it and the library shape is
used. `F C` with one space shows a chord moved right when `F#` needs the room. `C/E` moves its
bass; `[Bb]` is an inline chord. The `%tab` (with `{ch "F"}`) is never transposed: the notice says
so. "Switch sharps and flats" renames the `%shape` chords too. Autocomplete: type `%` on an empty
line of the block. Lyrics: "Shenandoah" (traditional).

```songsheet
%shape Bb x 1 3 3 3 1
%shape C x32010
%pattern Slow 8: d.d. dudu

[Verse]
%strum Slow
F            Bb     F
Oh Shenandoah, I long to see you
Dm       C/E  F C
Away, you rolling river
Bb          F         Dm
Oh Shenandoah, I long to see you
[Bb]Away, I'm [C]bound a[F]way

[Riff]
%tab
:8 1.6{ch "F"} 3.4 3.3 2.2 | :2 (1.6 3.5 3.4 2.3 1.2 1.1)
%endtab
```
