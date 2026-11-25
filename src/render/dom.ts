/**
 * The element an event happened on, or null (a window or document target). Checked with
 * Obsidian's `instanceOf`, which also works for a node of a popout window: such a node has its
 * window's own `Element`, so `instanceof Element` would be false.
 */
export function eventElement(event: Event): Element | null {
	const target = event.target as Partial<Node> | null;
	return target?.instanceOf?.(Element) ? target : null;
}
