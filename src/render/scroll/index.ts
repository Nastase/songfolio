import { lineHeightOf, scrollSpeed, step } from './speed';

/** A rendered song that can be scrolled: a songsheet block on screen. */
export interface ScrollTarget {
	/** The block's element; the song is drawn inside it. */
	readonly containerEl: HTMLElement;
	/** The song's `duration` property in seconds, or null. */
	readonly duration: number | null;
	/** Shows whether the song is scrolling (the header button). */
	showScrolling(scrolling: boolean): void;
}

/** Keys that scroll the note: pressing one takes over from autoscroll. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/** The header button's class: a tap on it toggles, it does not count as scrolling by hand. */
export const SCROLL_BUTTON = 'songfolio-scroll-button';

/**
 * Autoscroll (R17), one song at a time. Scrolls the note's view at the song's speed until the
 * song's end reaches the bottom of the screen, you scroll yourself (wheel, touch, scroll keys),
 * the song leaves the screen, or `stop` is called. Keeps the screen on while scrolling, where
 * the device allows it.
 */
export class AutoScroller {
	private current: {
		target: ScrollTarget;
		frame: number;
		stopListening: () => void;
		wakeLock: Promise<WakeLockSentinel | null>;
	} | null = null;

	constructor(private readonly linesPerMinute: () => number) {}

	isScrolling(target: ScrollTarget): boolean {
		return this.current?.target === target;
	}

	toggle(target: ScrollTarget): void {
		if (this.isScrolling(target)) this.stop();
		else this.start(target);
	}

	/** Stops scrolling; with a target, only when that song is the one scrolling. */
	stop(target?: ScrollTarget): void {
		const current = this.current;
		if (!current || (target && current.target !== target)) return;
		this.current = null;
		cancelAnimationFrame(current.frame);
		current.stopListening();
		void current.wakeLock.then((lock) => lock?.release()).catch(() => undefined);
		current.target.showScrolling(false);
	}

	private start(target: ScrollTarget): void {
		this.stop();
		const scroller = scrollerOf(target.containerEl);
		if (!scroller) return;

		const win = target.containerEl.win;
		const takeOver = (event: Event) => {
			if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return;
			if (event.target instanceof Element && event.target.closest(`.${SCROLL_BUTTON}`)) return;
			this.stop(target);
		};
		const options = { passive: true, capture: true };
		scroller.addEventListener('wheel', takeOver, options);
		scroller.addEventListener('touchstart', takeOver, options);
		scroller.addEventListener('pointerdown', takeOver, options);
		win.addEventListener('keydown', takeOver, true);
		const stopListening = () => {
			scroller.removeEventListener('wheel', takeOver, options);
			scroller.removeEventListener('touchstart', takeOver, options);
			scroller.removeEventListener('pointerdown', takeOver, options);
			win.removeEventListener('keydown', takeOver, true);
		};

		let carry = 0;
		let last: number | null = null;
		const frame = (time: number) => {
			if (!this.isScrolling(target)) return;
			const body = target.containerEl.querySelector<HTMLElement>('.songfolio-body');
			if (!body || !target.containerEl.isShown()) {
				this.stop(target);
				return;
			}
			const seconds = last === null ? 0 : (time - last) / 1000;
			last = time;
			const style = win.getComputedStyle(body);
			const speed = scrollSpeed({
				bodyHeight: body.offsetHeight,
				viewHeight: scroller.clientHeight,
				lineHeight: lineHeightOf(style.lineHeight, style.fontSize),
				duration: target.duration,
				linesPerMinute: this.linesPerMinute(),
			});
			const moved = step(carry, speed, seconds);
			carry = moved.carry;

			const end = body.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom;
			if (speed <= 0 || end <= 0) {
				this.stop(target);
				return;
			}
			if (moved.pixels > 0) {
				const before = scroller.scrollTop;
				scroller.scrollTop = before + Math.min(moved.pixels, Math.ceil(end));
				// The end of the note: nothing left to scroll.
				if (scroller.scrollTop === before) {
					this.stop(target);
					return;
				}
			}
			if (this.current) this.current.frame = win.requestAnimationFrame(frame);
		};

		this.current = { target, frame: win.requestAnimationFrame(frame), stopListening, wakeLock: keepAwake(win) };
		target.showScrolling(true);
	}
}

/** The element that scrolls the note: reading view or the live preview editor. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
	return el.closest<HTMLElement>('.markdown-preview-view, .cm-scroller');
}

/** Asks the device to keep the screen on, where the browser allows it. */
async function keepAwake(win: Window): Promise<WakeLockSentinel | null> {
	try {
		return (await win.navigator.wakeLock?.request('screen')) ?? null;
	} catch {
		return null;
	}
}
