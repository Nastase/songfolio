---
title: Spike - print layout
tuning: E A D G B E
time: 4/4
s1-mode: lazy
s2-print: await
s2-width: 654
s2-breaks: keep
s2-scale: 0.8
---

Spike S2 only (not merged). A song long enough for several A4 pages, to check "Export to PDF":
tabs complete and not cut, and page breaks not splitting a tab or a strum stand-in.
Lyrics: "Amazing Grace" (John Newton, 1779). Print settings, read only during export:

- `s2-print`: `await` (export waits for tabs, default) or `naive` (as in S1).
- `s2-width`: tab width in px while printing (default 654, the A4 text column; 0 = no fix, cut on A4).
- `s2-scale`: alphaTab scale while printing (default 0.8, two 8th-note bars per row).
- `s2-breaks`: `keep` (default: whole tab on one page when it fits, else break between rows),
  `rows` (break between rows only) or `block` (whole tab only; rows overlap when taller than a page).

```songsheet
%pattern Waltz 8: d.du du
[Intro]
%tab
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.4{ch "Dm"} 2.3 3.2 1.1 3.2 2.3 0.4 2.3 |
:8 0.6{ch "E7"} 2.5 0.4 1.3 0.2 1.3 0.4 2.5 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4
%endtab

[Verse 1]
      G              G7         C        G
Amazing grace! How sweet the sound
                         Em      D
That saved a wretch like me!
     G           G7          C       G
I once was lost, but now am found;
      Em        D        G
Was blind, but now I see.

[Verse 2]
      G                 G7        C       G
'Twas grace that taught my heart to fear,
                          Em     D
And grace my fears relieved;
      G             G7        C        G
How precious did that grace appear
      Em        D       G
The hour I first believed.

[Verse 3]
      G              G7          C          G
Through many dangers, toils and snares,
                        Em      D
I have already come;
      G             G7          C         G
'Tis grace hath brought me safe thus far,
       Em          D       G
And grace will lead me home.

%pattern Bridge 8: d.d. dudu
[Interlude]
%tab
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.4{ch "Dm"} 2.3 3.2 1.1 3.2 2.3 0.4 2.3 |
:8 0.6{ch "E7"} 2.5 0.4 1.3 0.2 1.3 0.4 2.5 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4
%endtab

[Verse 4]
      G               G7           C        G
The Lord has promised good to me,
                        Em      D
His word my hope secures;
      G            G7         C       G
He will my shield and portion be,
      Em        D        G
As long as life endures.

[Verse 1 again]
      G              G7         C        G
Amazing grace! How sweet the sound
                         Em      D
That saved a wretch like me!
     G           G7          C       G
I once was lost, but now am found;
      Em        D        G
Was blind, but now I see.

[Verse 2 again]
      G                 G7        C       G
'Twas grace that taught my heart to fear,
                          Em     D
And grace my fears relieved;
      G             G7        C        G
How precious did that grace appear
      Em        D       G
The hour I first believed.

%pattern Outro 8: d... d...
[Long solo, taller than a page]
%tab
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.4{ch "Dm"} 2.3 3.2 1.1 3.2 2.3 0.4 2.3 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.6{ch "E7"} 2.5 0.4 1.3 0.2 1.3 0.4 2.5 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.4{ch "Dm"} 2.3 3.2 1.1 3.2 2.3 0.4 2.3 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.6{ch "E7"} 2.5 0.4 1.3 0.2 1.3 0.4 2.5 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.4{ch "Dm"} 2.3 3.2 1.1 3.2 2.3 0.4 2.3 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4 |
:8 0.6{ch "E7"} 2.5 0.4 1.3 0.2 1.3 0.4 2.5 |
:8 0.5{ch "Am"} 2.4 2.3 1.2 0.1 1.2 2.3 2.4
%endtab

[Last verse]
      G              G7          C          G
Through many dangers, toils and snares,
                        Em      D
I have already come;
      G             G7          C         G
'Tis grace hath brought me safe thus far,
       Em          D       G
And grace will lead me home.
```
