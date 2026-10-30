---
title: Syntax errors
artist:
key: C
---

Covers: errors shown on the block with line numbers: an unknown directive, `%endtab` without `%tab`, and an unclosed `%ascii` that runs to the end of the song. The rest of the song still renders.

```songsheet
%pattern A 8: d.d. dudu
%chrods G C

[Verse]
%strum A
C                 G
First lyric line here
%endtab

[Outro]
%ascii
e|--0--|
[Not a section: still inside the ascii block]
```
