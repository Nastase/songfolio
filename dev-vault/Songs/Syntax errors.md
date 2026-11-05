---
title: Syntax errors
artist:
key: C
---

Covers: errors shown on the block with line numbers: an unknown directive, `%endtab` without `%tab`, and an unclosed `%ascii` that runs to the end of the song. Strumming errors: a repeated pattern name (in another case), grid 12, a symbol that is not a stroke, a `|` inside a bar, an unknown `%strum` option and an unknown pattern name. The rest of the song still renders.

```songsheet
%pattern A 8: d.d. dudu
%chrods G C
%pattern a 8: dudu dudu
%pattern Twelve 12: d.du .udu d.du
%pattern Typo 8: d.dy .udu
%pattern Split 8: d.du | .udu

[Verse]
%strum A +big
C                 G
First lyric line here
%endtab
%strum Nope

[Outro]
%ascii
e|--0--|
[Not a section: still inside the ascii block]
```
