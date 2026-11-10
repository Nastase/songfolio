/**
 * The alphaTex that alphaTab draws for a `%tab` block: what the plugin adds around the beats
 * (R8). Pure TypeScript: no Obsidian imports, so it can be unit-tested.
 */

import { Note } from 'tonal';
import type { Meter } from '../../parser/tab';
import type { Tuning } from '../../parser/tuning';

/** Standard tuning as MIDI notes, low E (E2) to high E (E4). */
const STANDARD_MIDI = [40, 45, 50, 55, 59, 64] as const;

export interface TabTex {
	tex: string;
	/** Lines added before the beats: alphaTex line `n` is block line `tabLine + n - preludeLines`. */
	preludeLines: number;
}

/**
 * A tab-only staff in the song's tuning and time signature, then the block's beats.
 * An invalid tuning means standard tuning; a meter that cannot be read means 4/4.
 * A `\ts` in the beats wins over the property from that bar on.
 */
export function buildTex(beats: string, tuning: Tuning, meter: Meter | null): TabTex {
	const prelude = ['\\track "Guitar"', '\\staff {tabs}', tuningTex(tuning), timeTex(meter)];
	return { tex: `${prelude.join('\n')}\n${beats}`, preludeLines: prelude.length };
}

/**
 * `\tuning (E4 B3 G3 D3 A2 E2)`: high to low, with octaves. Each string moves from standard by its
 * offset (the nearest way), so drop D gives D2 on the low string.
 */
export function tuningTex(tuning: Tuning): string {
	const offsets = tuning.valid ? tuning.offsets : STANDARD_MIDI.map(() => 0);
	const notes = STANDARD_MIDI.map((midi, index) => Note.fromMidiSharps(midi + (offsets[index] ?? 0)));
	return `\\tuning (${notes.reverse().join(' ')})`;
}

export function timeTex(meter: Meter | null): string {
	const { beats, value } = meter ?? { beats: 4, value: 4 };
	return `\\ts (${beats} ${value})`;
}

/** The block line of an alphaTex line, or the `%tab` line for a line in the prelude. */
export function blockLine(tabLine: number, texLine: number, preludeLines: number): number {
	return tabLine + Math.max(0, texLine - preludeLines);
}
