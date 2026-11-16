import { MarkdownView, Notice } from 'obsidian';
import type SongfolioPlugin from '../../main';
import type { SongBlock } from '../../render';

/** "Start or stop autoscroll" (R17), for the song on screen in the active note. */
export function registerScrollCommand(plugin: SongfolioPlugin): void {
	const { app, scroller } = plugin;
	plugin.addCommand({
		id: 'toggle-autoscroll',
		name: 'Start or stop autoscroll',
		checkCallback: (checking) => {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) return false;
			if (checking) return true;
			const block = songOnScreen(plugin.blocks, view.containerEl, (target) => scroller.isScrolling(target));
			if (block) scroller.toggle(block);
			else new Notice('There is no song on screen in this note.');
			return true;
		},
	});
}

/**
 * The song to start or stop: the one scrolling, else the first whose body is on screen in the
 * view (in reading view or in live preview).
 */
function songOnScreen(
	blocks: ReadonlySet<SongBlock>,
	viewEl: HTMLElement,
	scrolling: (block: SongBlock) => boolean,
): SongBlock | null {
	const shown = [...blocks].filter((block) => viewEl.contains(block.containerEl) && block.containerEl.isShown());
	const running = shown.find(scrolling);
	if (running) return running;
	const view = viewEl.getBoundingClientRect();
	const onScreen = shown
		.map((block) => ({ block, rect: block.containerEl.getBoundingClientRect() }))
		.filter(({ rect }) => rect.bottom > view.top && rect.top < view.bottom)
		.sort((a, b) => a.rect.top - b.rect.top);
	return onScreen[0]?.block ?? null;
}
