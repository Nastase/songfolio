import { Modal, type App } from 'obsidian';
import { drawVoicing } from './diagram';
import type { ChordDiagram, ShapeChoice } from './voicings';

/**
 * Dialog listing every fingering of a chord, the current one marked (R4). Picking another calls
 * `onPick` with the frets to write, or null to go back to the library's default.
 */
export class ShapeChooser extends Modal {
	constructor(
		app: App,
		private readonly diagram: ChordDiagram,
		private readonly choices: readonly ShapeChoice[],
		private readonly tuning: readonly string[],
		private readonly onPick: (frets: (number | null)[] | null) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const chord = this.diagram.chord.text;
		this.setTitle(`Shapes for ${chord}`);
		this.modalEl.addClass('songfolio-chooser-modal');
		const list = this.contentEl.createDiv({ cls: 'songfolio-chooser' });

		for (const choice of this.choices) {
			// The button is named by its diagram's aria-label and its caption. An aria-label on the
			// button itself would also show as a long tooltip.
			const option = list.createEl('button', {
				cls: 'songfolio-chooser-option',
				attr: { 'aria-pressed': String(choice.current) },
			});
			option.toggleClass('is-current', choice.current);
			drawVoicing(option, chord, choice.voicing, this.tuning);
			const caption = [choice.label, choice.current ? 'Current' : null].filter((part) => part !== null).join(' · ');
			option.createDiv({ cls: 'songfolio-chooser-caption', text: caption });

			option.addEventListener('click', () => {
				this.close();
				if (!choice.current) this.onPick(choice.frets);
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
