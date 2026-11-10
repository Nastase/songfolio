---
title: Amazing Grace
artist: "[[John Newton]]"
key: G
capo: 0
tuning: E A D G B E
tempo: 80
time: 3/4
difficulty: beginner
status: learning
started: 2026-10-30
learned:
source: Traditional (public domain)
tags:
  - genre/hymn
  - technique/fingerpicking
---

Covers: the syntax found in real Chord Sheets songs: `[Name] note` section headers, raw ASCII tab lines without `%ascii`, bar lines and `x2` on chord lines, `N.C.`, slash chords, single-space spacer lines, a wiki-linked artist. Also a 3/4 song with a 6-slot waltz pattern (counts 1 & 2 & 3 &), and a `%tab` melody that takes its 3/4 time signature from the `time` property.

```songsheet
%pattern Waltz 8: D.du du

[Intro] (picked, let ring)
e|-------3-----3---|
B|-----0---0-----0-|
G|---0-------0-----|
D|-----------------|
A|-----------------|
E|-3---------------| x2

| G  G/B | C  G | G  Em | D  D7 |  x2
 
[Verse 1]
%strum Waltz
G             G7      C        G
Amazing grace! How sweet the sound
G                     D
That saved a wretch like me!
G           G7         C       G
I once was lost, but now am found;
G      Em      D       G
Was blind, but now I see.
 
[Verse 2] x2
G                G7       C          G
'Twas grace that taught my heart to fear,
G                     D
And grace my fears relieved;
G             G7       C         G
How precious did that grace appear
     G/B   Em    D7      G
The hour I first believed.
 
[Melody]
%tab
:4 0.4{ch "G"} :2 0.3 | :8 0.2{ch "G7"} 0.3 :2 0.2 | :4 2.3{ch "C"} :2 0.3 | :4 2.4{ch "G"} :2 0.4 |
:4 0.4{ch "G"} :2 0.3 | :8 0.2 0.3 :2 0.2 | :4 2.3{ch "D"} :2 3.2 | :2 3.2{d}
%endtab
 
[Outro]
G  C/G  G  N.C.
```
