/**
 * Autoscroll speed (R17). Pure: no Obsidian imports, unit-tested.
 */

/** What the speed depends on, in CSS pixels and seconds. */
export interface ScrollMeasure {
	/** Height of the song's body: chords, lyrics, tabs. */
	bodyHeight: number;
	/** Height of the visible part of the note. */
	viewHeight: number;
	/** Line height of the body's text. */
	lineHeight: number;
	/** The song's `duration` property, or null. */
	duration: number | null;
	/** The "Autoscroll speed" setting, used without a duration. */
	linesPerMinute: number;
}

/**
 * Pixels per second. With a duration, the body scrolls by its height less one screen in that
 * time: from its first line at the top of the screen to its last line at the bottom. Without one,
 * by the set number of text lines per minute. Zero when there is nothing to scroll.
 */
export function scrollSpeed(measure: ScrollMeasure): number {
	const { bodyHeight, viewHeight, lineHeight, duration, linesPerMinute } = measure;
	if (duration !== null && duration > 0) return Math.max(0, bodyHeight - viewHeight) / duration;
	return Math.max(0, linesPerMinute) * lineHeight / 60;
}

/** A CSS `line-height` in pixels; `normal` and unreadable values count as 1.5 × the font size. */
export function lineHeightOf(lineHeight: string, fontSize: string): number {
	const size = parseFloat(fontSize) || 16;
	if (lineHeight.endsWith('px')) return parseFloat(lineHeight) || size * 1.5;
	const factor = parseFloat(lineHeight);
	return Number.isFinite(factor) && factor > 0 ? factor * size : size * 1.5;
}

/**
 * Moves an accumulated fraction of pixels forward by `seconds` at `speed`, returning the whole
 * pixels to scroll now and the fraction kept for the next frame. A long pause (a hidden window)
 * counts as at most a tenth of a second, so the song never jumps.
 */
export function step(carry: number, speed: number, seconds: number): { pixels: number; carry: number } {
	const total = carry + speed * Math.min(Math.max(seconds, 0), 0.1);
	const pixels = Math.floor(total);
	return { pixels, carry: total - pixels };
}

/** How fast the lead-in closes the gap to the song's first line: about 95 % in half a second. */
const LEAD_IN_SECONDS = 0.17;

/**
 * The lead-in before autoscroll: whole pixels to scroll now so the song's first line glides to
 * the top of the screen, `gap` pixels away. Eases out, at least one pixel a frame, never past it.
 */
export function leadIn(gap: number, seconds: number): number {
	if (gap <= 0) return 0;
	const eased = gap * (1 - Math.exp(-Math.min(Math.max(seconds, 0), 0.1) / LEAD_IN_SECONDS));
	return Math.min(Math.ceil(gap), Math.max(1, Math.round(eased)));
}
