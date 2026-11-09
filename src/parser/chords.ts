/**
 * The chords a song uses, for the diagram row in the header (R4).
 * Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import type { ChordSymbol, Song } from '../model/song';

/**
 * Every distinct chord in the song, in order of first appearance: chord lines and inline chords.
 * Chords are the same when written the same (`G/B` and `G` differ, so do `C#` and `Db`).
 * Bar lines, `N.C.` and other words on chord lines are left out.
 */
export function songChords(song: Pick<Song, 'sections'>): ChordSymbol[] {
	const chords = new Map<string, ChordSymbol>();
	const add = (chord: ChordSymbol) => {
		if (!chords.has(chord.text)) chords.set(chord.text, chord);
	};
	for (const section of song.sections) {
		for (const item of section.items) {
			if (item.kind === 'chords') {
				for (const token of item.tokens) if (token.kind === 'chord') add(token.chord);
			} else if (item.kind === 'lyrics') {
				for (const inline of item.inlineChords) add(inline.chord);
			}
		}
	}
	return [...chords.values()];
}
