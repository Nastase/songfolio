/**
 * Loads alphaTab only for songs with a `%tab`. The plugin is one CommonJS `main.js`, so this
 * `import()` cannot split alphaTab into its own file: it only runs alphaTab's module code the
 * first time a tab is drawn (spike S1).
 */

import bravura from '@coderline/alphatab/font/Bravura.woff2';

export type AlphaTab = typeof import('@coderline/alphatab');

let loading: Promise<AlphaTab> | null = null;

export function loadAlphaTab(): Promise<AlphaTab> {
	loading ??= import('@coderline/alphatab');
	return loading;
}

/** The Bravura music font, inlined in `main.js`: no extra files, no network calls. */
export function musicFontUrl(): string {
	return `data:font/woff2;base64,${bravura}`;
}

/**
 * The style alphaTab 1.8.4 shares between all its instances. It looks for `#alphaTabStyle` in
 * the tab's document but appends `#alphaTabStyleShared` to the main document, so every tab drawn
 * when no other is on screen, or in the PDF export window, adds another copy.
 */
const SHARED_STYLE = '#alphaTabStyleShared';

/** alphaTab's style elements: the shared one and one per music font and document. */
const STYLES = 'style[id^="alphaTabStyle"]';

/** Style elements alphaTab added for Songfolio's tabs, removed when the plugin unloads. */
const added = new Set<Element>();

function styleElements(doc: Document): Element[] {
	return [...new Set([...Array.from(doc.querySelectorAll(STYLES)), ...Array.from(document.querySelectorAll(STYLES))])];
}

/**
 * Runs `create` (which makes an alphaTab instance in `doc`), remembers the style elements it
 * added, and removes duplicate copies of the shared style.
 */
export function trackStyles<T>(doc: Document, create: () => T): T {
	const before = new Set(styleElements(doc));
	const result = create();
	for (const element of styleElements(doc)) if (!before.has(element)) added.add(element);
	document.querySelectorAll(SHARED_STYLE).forEach((element, index) => {
		if (index > 0) element.remove();
	});
	return result;
}

/**
 * Removes the styles alphaTab added for Songfolio when the plugin unloads: a reloaded plugin
 * starts with a new alphaTab, which would add its own copies.
 */
export function removeAddedStyles(): void {
	for (const element of added) element.remove();
	added.clear();
}
