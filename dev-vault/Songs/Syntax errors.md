---
title: Syntax errors
artist:
key: C
---

Covers: errors shown on the block with line numbers: an unknown directive, `%endtab` without `%tab`, and an unclosed `%ascii` that runs to the end of the song. Strumming errors: a repeated pattern name (in another case), grid 12, a symbol that is not a stroke, a `|` inside a bar, an unknown `%strum` option and an unknown pattern name. Shape errors: a wrong string count, a character that is not a fret, a fret above 24, and a repeated chord (Fm, whose first line has errors, so its diagram is the library one). Tab errors: a `\title` line inside `%tab` (score metadata: the line is ignored) and a note on string 7, shown in place of the tab with its line number. The rest of the song still renders.

```songsheet
%pattern A 8: d.d. dudu
%chrods G C
%pattern a 8: dudu dudu
%pattern Twelve 12: d.du .udu d.du
%pattern Typo 8: d.dy .udu
%pattern Split 8: d.du | .udu
%shape Fm 13311
%shape C x3y010
%shape G 25 x x x x x
%shape Fm 1 3 3 1 1 1

[Verse]
%strum A +big
C                 G
First lyric line here
%endtab
%strum Nope

[Solo]
%tab
\title "Solo"
:8 0.5 2.4 2.3 1.2 | 3.7 0.2
%endtab

[Outro]
%ascii
e|--0--|
[Not a section: still inside the ascii block]
```
