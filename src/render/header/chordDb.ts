/*!
 * Adapted from Chord Sheets 1.11.0, src/instruments/fretRenderer.ts (getTonicVariations, findDbChord)
 * https://github.com/olvidalo/obsidian-chord-sheets/blob/e563134dece0e4d09d1b647f07b620022427d980/src/instruments/fretRenderer.ts
 * Copyright (c) 2023 Marcel Schaeben. MIT License, see THIRD_PARTY_NOTICES.md.
 * @license MIT
 */

// Songfolio: pure (no Obsidian imports), so it can be unit-tested. Guitar only.

import type { ChordDef, InstrumentChords } from '@tombatossals/chords-db';
import { Note } from 'tonal';
import type { SheetChord } from '../../parser/chordsheets/chordsUtils';

export function getTonicVariations(tonic: string) {
	const tonicVariations = [
		tonic, Note.simplify(tonic), Note.enharmonic(tonic)
	];

	// the guitar database of chords-db has C# as Csharp etc.
	const sharp = '#';
	const sharpVariation = tonicVariations.find(variation => variation?.includes(sharp));
	if (sharpVariation) {
		tonicVariations.push(sharpVariation.replace(sharp, 'sharp'));
	}
	return tonicVariations;
}

export function findDbChord(chord: SheetChord, instrumentChords: InstrumentChords): ChordDef | null {
	if (!chord.tonic) {
		return null;
	}
	const tonicVariations = getTonicVariations(chord.tonic);

	const availableTonicKeys = Object.keys(instrumentChords.chords);
	const tonicKey = availableTonicKeys.find(note => tonicVariations.includes(note));

	if (!tonicKey) {
		return null;
	}
	const keyChords = instrumentChords.chords[tonicKey] ?? [];

	let dbChord: ChordDef | undefined;

	if (chord.bass) {
		// First priority: Exact match with bass note. Some tonal types have no name, and "" + "/G" would be the
		// major chord over the bass.
		const bassSuffix = `/${chord.bass}`;
		dbChord = keyChords.find(
			testChord => chord.type !== '' && testChord.suffix === chord.type + bassSuffix
		);
		if (dbChord) return dbChord;

		// Second priority: Alias match with bass note
		dbChord = keyChords.find(
			testChord => chord.aliases.some(alias => testChord.suffix === alias + bassSuffix)
		);
		if (dbChord) return dbChord;
	} else {
		dbChord = keyChords.find(
			testChord => testChord.suffix === chord.type
		);
		if (dbChord) return dbChord;

		dbChord = keyChords.find(
			testChord => chord.aliases.includes(testChord.suffix)
		);
	}

	return dbChord ?? null;
}
