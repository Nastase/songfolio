---
title: Strumming edge cases
artist:
key: G
time: 4/4
---

Covers the strumming extras (none of these are errors): a `%strum` before the first section (it labels the opening part), a pattern defined after its use, a name with spaces used in another case, `-` for no stroke, a 2-bar pattern with `|` bar lines (counts restart each bar; on a narrow screen the second bar wraps), a mid-section switch, and `+draw` beside a title and at a switch.

```songsheet
%strum Two bar
G  C  G  D

%pattern Steady 8: d-du -udu
%pattern Two  bar 8: | D.du .udu | d.du X.ux |

[Verse]
%strum steady +draw
G                C
First lyric line here
%strum TWO BAR +draw
G                D
Second lyric line here

[Chorus]
%strum Late
C                G
Third lyric line here

%pattern Late 16: D.du .udu X.du .udu
```
